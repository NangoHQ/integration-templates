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

const sync = createSync({
    description: 'Full-refresh sync of sales pipelines and their opportunity statuses.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    // https://developer.close.com/
    models: {
        Pipeline: PipelineSchema
    },

    exec: async (nango) => {
        // https://developer.close.com/
        await nango.trackDeletesStart('Pipeline');

        // https://developer.close.com/
        const proxyConfig: ProxyConfiguration = {
            // https://developer.close.com/
            endpoint: '/v1/pipeline/',
            paginate: {
                type: 'offset',
                offset_name_in_request: '_skip',
                offset_start_value: 0,
                offset_calculation_method: 'per-page',
                limit_name_in_request: '_limit',
                limit: 200,
                response_path: 'data'
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const pipelines = [];
            for (const record of page) {
                const parsed = PipelineSchema.safeParse(record);
                if (!parsed.success) {
                    throw new Error(`Failed to parse pipeline: ${parsed.error.message}`);
                }
                pipelines.push(parsed.data);
            }

            if (pipelines.length > 0) {
                await nango.batchSave(pipelines, 'Pipeline');
            }
        }

        await nango.trackDeletesEnd('Pipeline');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
