import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const GroupMembershipSchema = z.object({
    id: z.string(),
    groupId: z.string(),
    userId: z.string(),
    email: z.string().optional(),
    status: z.string().optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string(),
    last_full_refresh: z.string()
});

const StoredCheckpointSchema = z.object({
    updated_after: z.string().optional(),
    last_full_refresh: z.string().optional()
});

const FULL_REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;

const GroupSchema = z.object({
    id: z.string(),
    lastMembershipUpdated: z.string().optional()
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
    checkpoint: CheckpointSchema,
    models: {
        GroupMembership: GroupMembershipSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = StoredCheckpointSchema.parse(rawCheckpoint ?? {});
        const updatedAfter = checkpoint?.updated_after;
        const runStartedAt = new Date().toISOString();
        const shouldFullRefresh =
            !checkpoint.last_full_refresh || new Date(runStartedAt).getTime() - new Date(checkpoint.last_full_refresh).getTime() > FULL_REFRESH_INTERVAL_MS;

        const groupsToProcess: Array<z.infer<typeof GroupSchema>> = [];

        const groupsProxyConfig: ProxyConfiguration = {
            // https://developer.okta.com/docs/reference/api/groups/
            endpoint: '/api/v1/groups',
            paginate: {
                type: 'link',
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

                const group = parsed.data;
                if (!shouldFullRefresh && updatedAfter && group.lastMembershipUpdated && group.lastMembershipUpdated <= updatedAfter) {
                    continue;
                }

                groupsToProcess.push(group);
            }
        }

        if (shouldFullRefresh) {
            // Delete tracking is model-wide, so it is only safe during a true full crawl.
            await nango.trackDeletesStart('GroupMembership');
        }

        for (const group of groupsToProcess) {
            const proxyConfig: ProxyConfiguration = {
                // https://developer.okta.com/docs/reference/api/groups/
                endpoint: `/api/v1/groups/${encodeURIComponent(group.id)}/users`,
                paginate: {
                    type: 'link',
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

        if (shouldFullRefresh) {
            await nango.trackDeletesEnd('GroupMembership');
        }

        await nango.saveCheckpoint({
            updated_after: runStartedAt,
            last_full_refresh: shouldFullRefresh ? runStartedAt : (checkpoint.last_full_refresh ?? runStartedAt)
        });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
