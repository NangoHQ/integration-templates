import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const PipelineStatusSchema = z.object({
    id: z.string(),
    label: z.string(),
    type: z.enum(['active', 'won', 'lost'])
});

const PipelineSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    organization_id: z.string().optional(),
    date_created: z.string().optional(),
    date_updated: z.string().optional(),
    statuses: z.array(PipelineStatusSchema).optional()
});

const PipelinePageSchema = z.object({
    data: z.array(z.unknown()),
    has_more: z.boolean()
});

const CheckpointSchema = z.object({
    skip: z.number()
});

const sync = createSync({
    description: 'Full-refresh sync of sales pipelines and their opportunity statuses.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    // https://developer.close.com/
    models: {
        Pipeline: PipelineSchema
    },

    exec: async (nango) => {
        // https://developer.close.com/
        const rawCheckpoint = await nango.getCheckpoint();
        let skip = 0;
        if (rawCheckpoint !== undefined && rawCheckpoint !== null) {
            const parsedCheckpoint = CheckpointSchema.safeParse(rawCheckpoint);
            if (!parsedCheckpoint.success) {
                throw new Error(`Invalid checkpoint: ${parsedCheckpoint.error.message}`);
            }
            skip = parsedCheckpoint.data.skip;
        }

        // https://developer.close.com/
        await nango.trackDeletesStart('Pipeline');

        const limit = 200;
        let hasMore = true;

        do {
            const proxyConfig: ProxyConfiguration = {
                // https://developer.close.com/
                endpoint: '/v1/pipeline/',
                params: {
                    _limit: String(limit),
                    _skip: String(skip)
                },
                retries: 3
            };

            // https://developer.close.com/
            const response = await nango.get(proxyConfig);

            const parsedPage = PipelinePageSchema.safeParse(response.data);
            if (!parsedPage.success) {
                throw new Error(`Failed to parse pipeline page: ${parsedPage.error.message}`);
            }

            const pipelines = [];
            for (const record of parsedPage.data.data) {
                const parsed = PipelineSchema.safeParse(record);
                if (!parsed.success) {
                    throw new Error(`Failed to parse pipeline: ${parsed.error.message}`);
                }
                pipelines.push(parsed.data);
            }

            if (pipelines.length > 0) {
                await nango.batchSave(pipelines, 'Pipeline');
            }

            hasMore = parsedPage.data.has_more;
            if (hasMore) {
                skip += limit;
                await nango.saveCheckpoint({ skip });
            }
        } while (hasMore);

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Pipeline');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
