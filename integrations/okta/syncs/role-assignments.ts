import { createSync, type ProxyConfiguration } from 'nango';
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

const sync = createSync({
    description: 'Sync admin role assignments for users and groups.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        RoleAssignment: RoleAssignmentSchema
    },

    exec: async (nango) => {
        const userProxyConfig: ProxyConfiguration = {
            // https://developer.okta.com/docs/reference/api/users/
            endpoint: '/api/v1/users',
            paginate: {
                type: 'link',
                limit: 100,
                limit_name_in_request: 'limit'
            },
            retries: 3
        };

        const users: { id: string }[] = [];
        for await (const batch of nango.paginate(userProxyConfig)) {
            const parsed = z.array(PrincipalSchema).safeParse(batch);
            if (!parsed.success) {
                throw new Error(`Failed to parse users batch: ${parsed.error.message}`);
            }
            users.push(...parsed.data);
        }

        const groupProxyConfig: ProxyConfiguration = {
            // https://developer.okta.com/docs/reference/api/groups/
            endpoint: '/api/v1/groups',
            paginate: {
                type: 'link',
                limit: 100,
                limit_name_in_request: 'limit'
            },
            retries: 3
        };

        const groups: { id: string }[] = [];
        for await (const batch of nango.paginate(groupProxyConfig)) {
            const parsed = z.array(PrincipalSchema).safeParse(batch);
            if (!parsed.success) {
                throw new Error(`Failed to parse groups batch: ${parsed.error.message}`);
            }
            groups.push(...parsed.data);
        }

        await nango.trackDeletesStart('RoleAssignment');

        for (const user of users) {
            // https://developer.okta.com/docs/reference/api/roles/
            const response = await nango.get({
                endpoint: `/api/v1/users/${encodeURIComponent(user.id)}/roles`,
                retries: 3
            });

            const roles = z.array(RoleSchema).safeParse(response.data);
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

        for (const group of groups) {
            // https://developer.okta.com/docs/reference/api/roles/
            const response = await nango.get({
                endpoint: `/api/v1/groups/${encodeURIComponent(group.id)}/roles`,
                retries: 3
            });

            const roles = z.array(RoleSchema).safeParse(response.data);
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

        await nango.trackDeletesEnd('RoleAssignment');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
