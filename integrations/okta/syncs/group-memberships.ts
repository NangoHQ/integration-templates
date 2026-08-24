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

const sync = createSync({
    description: 'Sync group membership',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        GroupMembership: GroupMembershipSchema
    },

    exec: async (nango) => {
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

        for (const group of groupsToProcess) {
            const proxyConfig: ProxyConfiguration = {
                // https://developer.okta.com/docs/reference/api/groups/
                endpoint: `/api/v1/groups/${encodeURIComponent(group.id)}/users`,
                paginate: {
                    type: 'link',
                    link_rel_in_response_header: 'next',
                    limit_name_in_request: 'limit',
                    limit: 100
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
                        throw new Error(`Failed to parse user in group ${group.id}: ${parsed.error.message}`);
                    }

                    const user = parsed.data;
                    const record: {
                        id: string;
                        groupId: string;
                        userId: string;
                        email?: string;
                        status?: string;
                    } = {
                        id: `${group.id}_${user.id}`,
                        groupId: group.id,
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
        }

        await nango.trackDeletesEnd('GroupMembership');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
