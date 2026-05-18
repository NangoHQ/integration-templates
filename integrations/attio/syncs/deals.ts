import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const CheckpointSchema = z.object({
    offset: z.number().int().nonnegative(),
    in_progress: z.boolean()
});

const AttioRecordIdSchema = z.object({
    workspace_id: z.string(),
    object_id: z.string(),
    record_id: z.string()
});

const ProviderDealSchema = z.object({
    id: AttioRecordIdSchema,
    created_at: z.string(),
    web_url: z.string().optional(),
    values: z.record(z.string(), z.unknown()).optional()
});

const DealSchema = z.object({
    id: z.string(),
    created_at: z.string(),
    web_url: z.string().optional(),
    values: z.record(z.string(), z.unknown()).optional()
});

const QueryResponseSchema = z.object({
    data: z.array(ProviderDealSchema)
});

const sync = createSync({
    description: 'Sync Attio deal records',
    version: '2.0.0',
    frequency: 'every 5 minutes',
    autoStart: true,
    endpoints: [
        {
            method: 'POST',
            path: '/syncs/deals'
        }
    ],
    scopes: ['record_permission:read', 'object_configuration:read'],
    checkpoint: CheckpointSchema,
    models: {
        Deal: DealSchema
    },

    exec: async (nango) => {
        const checkpoint = CheckpointSchema.partial().parse((await nango.getCheckpoint()) ?? {});
        let offset = checkpoint.offset ?? 0;
        const inProgress = checkpoint.in_progress ?? false;
        const limit = 100;

        if (!inProgress) {
            await nango.trackDeletesStart('Deal');
        }

        let hasMore = true;

        while (hasMore) {
            const proxyConfig: ProxyConfiguration = {
                // https://docs.attio.com/rest-api/guides/filtering-and-sorting
                endpoint: '/v2/objects/deals/records/query',
                method: 'POST',
                data: {
                    sorts: [{ direction: 'asc', attribute: 'created_at' }],
                    limit,
                    offset
                },
                retries: 3
            };

            const response = await nango.post(proxyConfig);
            const parsedResponse = QueryResponseSchema.parse(response.data);
            const page = parsedResponse.data;

            const records = page.map((record) => ({
                id: record.id.record_id,
                created_at: record.created_at,
                ...(record.web_url != null && { web_url: record.web_url }),
                ...(record.values != null && { values: record.values })
            }));

            if (records.length > 0) {
                await nango.batchSave(records, 'Deal');
            }

            if (page.length < limit) {
                hasMore = false;
            } else {
                offset += limit;
                await nango.saveCheckpoint({ offset, in_progress: true });
            }
        }

        await nango.trackDeletesEnd('Deal');
        await nango.clearCheckpoint();
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
