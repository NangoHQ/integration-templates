import { createSync } from 'nango';
import { z } from 'zod';

const RoleAssignmentSchema = z.object({
    id: z.string(),
    principalType: z.enum(['user', 'group']),
    principalId: z.string(),
    type: z.string(),
    label: z.string().optional(),
    status: z.string().optional(),
    created: z.string().optional(),
    lastUpdated: z.string().optional()
});

const PrincipalSchema = z.object({
    id: z.string()
});

const RoleSchema = z.object({
    id: z.string(),
    label: z.string().optional().nullable(),
    type: z.string(),
    status: z.string().optional().nullable(),
    created: z.string().optional().nullable(),
    lastUpdated: z.string().optional().nullable()
});

const CheckpointSchema = z.object({
    phase: z.string(),
    nextUrl: z.string()
});

const StoredCheckpointSchema = z.object({
    phase: z.enum(['users', 'groups']).optional(),
    nextUrl: z.string().optional()
});

function getNextPageUrl(linkHeader: string | undefined): string | undefined {
    if (!linkHeader) {
        return undefined;
    }

    const parts = linkHeader.split(',');
    for (const part of parts) {
        const match = part.match(/<([^>]+)>;\s*rel="next"/i);
        if (match) {
            const url = match[1];
            if (!url) {
                continue;
            }
            try {
                const parsed = new URL(url);
                return parsed.pathname + parsed.search;
            } catch {
                return url;
            }
        }
    }

    return undefined;
}

const sync = createSync({
    description: 'Sync admin role assignments for users and groups.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        RoleAssignment: RoleAssignmentSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = StoredCheckpointSchema.safeParse(rawCheckpoint ?? {});
        if (!checkpoint.success) {
            throw new Error(`Invalid checkpoint: ${checkpoint.error.message}`);
        }

        await nango.trackDeletesStart('RoleAssignment');

        let phase = checkpoint.data?.phase ?? 'users';
        let nextUrl = checkpoint.data?.nextUrl || undefined;

        if (phase === 'users') {
            while (true) {
                let response;
                if (nextUrl) {
                    response = await nango.get({
                        // https://developer.okta.com/docs/reference/api/users/
                        endpoint: nextUrl,
                        retries: 3
                    });
                } else {
                    response = await nango.get({
                        // https://developer.okta.com/docs/reference/api/users/
                        endpoint: '/api/v1/users',
                        params: { limit: 100 },
                        retries: 3
                    });
                }

                const parsedUsers = z.array(PrincipalSchema).safeParse(response.data);
                if (!parsedUsers.success) {
                    throw new Error(`Failed to parse users batch: ${parsedUsers.error.message}`);
                }

                for (const user of parsedUsers.data) {
                    // https://developer.okta.com/docs/reference/api/roles/
                    const roleResponse = await nango.get({
                        endpoint: `/api/v1/users/${encodeURIComponent(user.id)}/roles`,
                        retries: 3
                    });

                    const roles = z.array(RoleSchema).safeParse(roleResponse.data);
                    if (!roles.success) {
                        throw new Error(`Failed to parse roles for user ${user.id}: ${roles.error.message}`);
                    }

                    const assignments = roles.data.map((role) => ({
                        id: `user:${user.id}:${role.id}`,
                        principalType: 'user',
                        principalId: user.id,
                        type: role.type,
                        ...(role.label != null && { label: role.label }),
                        ...(role.status != null && { status: role.status }),
                        ...(role.created != null && { created: role.created }),
                        ...(role.lastUpdated != null && { lastUpdated: role.lastUpdated })
                    }));

                    if (assignments.length > 0) {
                        await nango.batchSave(assignments, 'RoleAssignment');
                    }
                }

                const nextPageUrl = getNextPageUrl(response.headers?.['link']);
                if (nextPageUrl) {
                    nextUrl = nextPageUrl;
                    await nango.saveCheckpoint({ phase: 'users', nextUrl });
                } else {
                    phase = 'groups';
                    nextUrl = undefined;
                    await nango.saveCheckpoint({ phase: 'groups', nextUrl: '' });
                    break;
                }
            }
        }

        if (phase === 'groups') {
            while (true) {
                let response;
                if (nextUrl) {
                    response = await nango.get({
                        // https://developer.okta.com/docs/reference/api/groups/
                        endpoint: nextUrl,
                        retries: 3
                    });
                } else {
                    response = await nango.get({
                        // https://developer.okta.com/docs/reference/api/groups/
                        endpoint: '/api/v1/groups',
                        params: { limit: 100 },
                        retries: 3
                    });
                }

                const parsedGroups = z.array(PrincipalSchema).safeParse(response.data);
                if (!parsedGroups.success) {
                    throw new Error(`Failed to parse groups batch: ${parsedGroups.error.message}`);
                }

                for (const group of parsedGroups.data) {
                    // https://developer.okta.com/docs/reference/api/roles/
                    const roleResponse = await nango.get({
                        endpoint: `/api/v1/groups/${encodeURIComponent(group.id)}/roles`,
                        retries: 3
                    });

                    const roles = z.array(RoleSchema).safeParse(roleResponse.data);
                    if (!roles.success) {
                        throw new Error(`Failed to parse roles for group ${group.id}: ${roles.error.message}`);
                    }

                    const assignments = roles.data.map((role) => ({
                        id: `group:${group.id}:${role.id}`,
                        principalType: 'group',
                        principalId: group.id,
                        type: role.type,
                        ...(role.label != null && { label: role.label }),
                        ...(role.status != null && { status: role.status }),
                        ...(role.created != null && { created: role.created }),
                        ...(role.lastUpdated != null && { lastUpdated: role.lastUpdated })
                    }));

                    if (assignments.length > 0) {
                        await nango.batchSave(assignments, 'RoleAssignment');
                    }
                }

                const nextPageUrl = getNextPageUrl(response.headers?.['link']);
                if (nextPageUrl) {
                    nextUrl = nextPageUrl;
                    await nango.saveCheckpoint({ phase: 'groups', nextUrl });
                } else {
                    await nango.clearCheckpoint();
                    await nango.trackDeletesEnd('RoleAssignment');
                    break;
                }
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
