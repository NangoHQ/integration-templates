import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const GroupMembershipSchema = z.object({
    id: z.string(),
    groupId: z.string(),
    userId: z.string(),
    email: z.string().optional(),
    status: z.string().optional()
});

const GroupSchema = z.object({
    id: z.string()
});

const OktaUserSchema = z.object({
    id: z.string(),
    status: z.string().optional(),
    profile: z
        .object({
            email: z.string().optional()
        })
        .optional()
});

const CheckpointSchema = z.object({
    groupIndex: z.number().int().nonnegative(),
    after: z.string()
});

const StoredCheckpointSchema = z.object({
    groupIndex: z.number().int().nonnegative().optional(),
    after: z.string().optional()
});

function extractAfterFromUrl(urlString: string): string | undefined {
    try {
        const url = new URL(urlString);
        return url.searchParams.get('after') ?? undefined;
    } catch {
        const queryIndex = urlString.indexOf('?');
        if (queryIndex !== -1) {
            const params = new URLSearchParams(urlString.slice(queryIndex));
            return params.get('after') ?? undefined;
        }
        return undefined;
    }
}

const sync = createSync({
    description: 'Sync group membership',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        GroupMembership: GroupMembershipSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = StoredCheckpointSchema.parse(rawCheckpoint ?? {});

        // Delete tracking is model-wide, and Okta gives no way to fetch previously-synced
        // records back, so which members were removed from a specific group since the last
        // run can't be reconstructed. Reconciling deletions correctly requires re-crawling
        // every group's current membership and delete-tracking the whole model each run.
        const groupsToProcess: Array<z.infer<typeof GroupSchema>> = [];

        const groupsProxyConfig: ProxyConfiguration = {
            // https://developer.okta.com/docs/reference/api/groups/
            endpoint: '/api/v1/groups',
            paginate: {
                type: 'link',
                link_rel_in_response_header: 'next',
                limit_name_in_request: 'limit',
                limit: 1000
            },
            retries: 3
        };

        for await (const rawGroups of nango.paginate(groupsProxyConfig)) {
            if (!Array.isArray(rawGroups)) {
                throw new Error('Unexpected response from Okta groups endpoint');
            }

            for (const rawGroup of rawGroups) {
                const parsed = GroupSchema.safeParse(rawGroup);
                if (!parsed.success) {
                    throw new Error(`Failed to parse group: ${parsed.error.message}`);
                }

                groupsToProcess.push(parsed.data);
            }
        }

        await nango.trackDeletesStart('GroupMembership');

        const startIndex = checkpoint.groupIndex ?? 0;

        let i = startIndex;
        for (const group of groupsToProcess.slice(startIndex)) {
            const groupIndex = i;
            const groupId = group.id;
            const resumeAfter = i === startIndex ? checkpoint.after : undefined;

            const proxyConfig: ProxyConfiguration = {
                // https://developer.okta.com/docs/reference/api/groups/
                endpoint: `/api/v1/groups/${encodeURIComponent(groupId)}/users`,
                ...(resumeAfter ? { params: { after: resumeAfter } } : {}),
                paginate: {
                    type: 'link',
                    link_rel_in_response_header: 'next',
                    limit_name_in_request: 'limit',
                    limit: 100,
                    on_page: async ({ nextPageParam }) => {
                        if (typeof nextPageParam === 'string') {
                            const after = extractAfterFromUrl(nextPageParam);
                            if (after) {
                                await nango.saveCheckpoint({ groupIndex, after });
                            }
                        }
                    }
                },
                retries: 3
            };

            for await (const users of nango.paginate(proxyConfig)) {
                if (!Array.isArray(users)) {
                    throw new Error('Unexpected response from Okta groups users endpoint');
                }

                const memberships: Array<z.infer<typeof GroupMembershipSchema>> = [];

                for (const rawUser of users) {
                    const parsed = OktaUserSchema.safeParse(rawUser);
                    if (!parsed.success) {
                        throw new Error(`Failed to parse user in group ${groupId}: ${parsed.error.message}`);
                    }

                    const user = parsed.data;
                    const record: {
                        id: string;
                        groupId: string;
                        userId: string;
                        email?: string;
                        status?: string;
                    } = {
                        id: `${groupId}_${user.id}`,
                        groupId: groupId,
                        userId: user.id
                    };

                    if (user.profile?.email) {
                        record.email = user.profile.email;
                    }

                    if (user.status) {
                        record.status = user.status;
                    }

                    memberships.push(record);
                }

                if (memberships.length > 0) {
                    await nango.batchSave(memberships, 'GroupMembership');
                }
            }

            await nango.saveCheckpoint({ groupIndex: groupIndex + 1, after: '' });
            i++;
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('GroupMembership');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
