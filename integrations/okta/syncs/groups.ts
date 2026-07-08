import { createSync } from 'nango';
import { z } from 'zod';

const GroupSchema = z.object({
    id: z.string(),
    created: z.string().optional(),
    lastUpdated: z.string().optional(),
    lastMembershipUpdated: z.string().optional(),
    objectClass: z.array(z.string()).optional(),
    type: z.string().optional(),
    profile: z
        .object({
            name: z.string().optional(),
            description: z.string().optional()
        })
        .optional()
});

const ProviderGroupSchema = GroupSchema;

const CheckpointSchema = z.object({
    updated_after: z.string(),
    last_full_refresh: z.string()
});

const StoredCheckpointSchema = z.object({
    updated_after: z.string().optional(),
    last_full_refresh: z.string().optional()
});

const FULL_REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;

const sync = createSync({
    description: 'Sync groups.',
    version: '1.0.0',
    frequency: 'every 5 minutes',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Group: GroupSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = StoredCheckpointSchema.parse(rawCheckpoint ?? {});
        const updatedAfter = checkpoint?.updated_after;
        const runStartedAt = new Date().toISOString();
        const shouldFullRefresh =
            !checkpoint.last_full_refresh || new Date(runStartedAt).getTime() - new Date(checkpoint.last_full_refresh).getTime() > FULL_REFRESH_INTERVAL_MS;

        if (shouldFullRefresh) {
            await nango.trackDeletesStart('Group');
        }

        // https://developer.okta.com/docs/reference/api/groups/
        for await (const page of nango.paginate({
            endpoint: '/api/v1/groups',
            params: {
                ...(!shouldFullRefresh && updatedAfter && { search: `lastUpdated gt "${updatedAfter}"` })
            },
            paginate: {
                type: 'link',
                link_rel_in_response_header: 'next',
                limit_name_in_request: 'limit',
                limit: 1000
            },
            retries: 3
        })) {
            const groups = page.map((item) => {
                const group = ProviderGroupSchema.parse(item);
                return {
                    id: group.id,
                    ...(group.created != null && { created: group.created }),
                    ...(group.lastUpdated != null && { lastUpdated: group.lastUpdated }),
                    ...(group.lastMembershipUpdated != null && { lastMembershipUpdated: group.lastMembershipUpdated }),
                    ...(group.objectClass != null && { objectClass: group.objectClass }),
                    ...(group.type != null && { type: group.type }),
                    ...(group.profile != null && { profile: group.profile })
                };
            });

            if (groups.length > 0) {
                await nango.batchSave(groups, 'Group');
            }
        }

        if (shouldFullRefresh) {
            await nango.trackDeletesEnd('Group');
        }

        await nango.saveCheckpoint({
            updated_after: runStartedAt,
            last_full_refresh: shouldFullRefresh ? runStartedAt : (checkpoint.last_full_refresh ?? runStartedAt)
        });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
