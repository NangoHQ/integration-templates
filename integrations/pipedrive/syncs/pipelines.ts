import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const PipelineSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    update_time: z.string(),
    add_time: z.string().optional(),
    is_deal_probability_enabled: z.boolean().optional()
});

const ProviderPipelineSchema = z.object({
    id: z.number(),
    name: z.string().optional(),
    update_time: z.string().nullable().optional(),
    add_time: z.string().optional(),
    is_deal_probability_enabled: z.boolean().optional()
});

type ProviderPipeline = z.infer<typeof ProviderPipelineSchema>;

const CheckpointSchema = z.object({
    start: z.number()
});

const sync = createSync({
    description: 'Sync pipelines from Pipedrive.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [
        {
            path: '/syncs/pipelines',
            method: 'POST'
        }
    ],
    checkpoint: CheckpointSchema,
    models: {
        Pipeline: PipelineSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let start: number | undefined = checkpoint?.start ?? 0;

        await nango.trackDeletesStart('Pipeline');

        const proxyConfig: ProxyConfiguration = {
            // https://developers.pipedrive.com/docs/api/v1/Pipelines#getPipelines
            endpoint: '/v1/pipelines',
            params: {
                sort_by: 'update_time',
                sort_direction: 'asc',
                limit: 500
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'start',
                offset_start_value: start ?? 0,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'limit',
                limit: 500,
                response_path: 'data',
                on_page: async ({ nextPageParam }) => {
                    start = typeof nextPageParam === 'number' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate<ProviderPipeline>(proxyConfig)) {
            const validatedPipelines = z.array(ProviderPipelineSchema).parse(page);

            const pipelines = validatedPipelines.map((pipeline) => {
                const updateTime = pipeline.update_time ?? pipeline.add_time;
                if (!updateTime) {
                    throw new Error(`Pipeline ${pipeline.id} missing update_time and add_time`);
                }
                return {
                    id: String(pipeline.id),
                    ...(pipeline.name !== undefined && { name: pipeline.name }),
                    update_time: updateTime,
                    ...(pipeline.add_time !== undefined && { add_time: pipeline.add_time }),
                    ...(pipeline.is_deal_probability_enabled !== undefined && {
                        is_deal_probability_enabled: pipeline.is_deal_probability_enabled
                    })
                };
            });

            if (pipelines.length > 0) {
                await nango.batchSave(pipelines, 'Pipeline');
            }

            if (start !== undefined) {
                await nango.saveCheckpoint({ start });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Pipeline');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
