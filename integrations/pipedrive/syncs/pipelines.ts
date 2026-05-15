import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const PipelineSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    update_time: z.string(),
    add_time: z.string().optional(),
    is_deal_probability_enabled: z.boolean().optional()
});

const CheckpointSchema = z.object({
    cursor: z.string()
});

const ProviderPipelineSchema = z.object({
    id: z.number(),
    name: z.string().optional(),
    update_time: z.string(),
    add_time: z.string().optional(),
    is_deal_probability_enabled: z.boolean().optional()
});

type ProviderPipeline = z.infer<typeof ProviderPipelineSchema>;

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
        let cursor = checkpoint?.cursor;

        // Blocker: the pipelines list endpoint only exposes cursor pagination,
        // not an updated-since filter, so this remains a full refresh.
        await nango.trackDeletesStart('Pipeline');

        const proxyConfig: ProxyConfiguration = {
            // https://developers.pipedrive.com/docs/api/v1/Pipelines#getPipelines
            endpoint: '/v1/pipelines',
            params: {
                sort_by: 'update_time',
                sort_direction: 'asc',
                limit: 500,
                ...(cursor ? { cursor } : {})
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'cursor',
                cursor_path_in_response: 'additional_data.next_cursor',
                response_path: 'data',
                limit_name_in_request: 'limit',
                limit: 500,
                on_page: async ({ nextPageParam }) => {
                    cursor = typeof nextPageParam === 'string' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate<ProviderPipeline>(proxyConfig)) {
            const validatedPipelines = page
                .map((item) => {
                    const result = ProviderPipelineSchema.safeParse(item);
                    if (!result.success) {
                        return null;
                    }
                    return result.data;
                })
                .filter((item): item is ProviderPipeline => item !== null);

            const pipelines = validatedPipelines.map((pipeline) => ({
                id: String(pipeline.id),
                ...(pipeline.name !== undefined && { name: pipeline.name }),
                update_time: pipeline.update_time,
                ...(pipeline.add_time !== undefined && { add_time: pipeline.add_time }),
                ...(pipeline.is_deal_probability_enabled !== undefined && {
                    is_deal_probability_enabled: pipeline.is_deal_probability_enabled
                })
            }));

            if (pipelines.length > 0) {
                await nango.batchSave(pipelines, 'Pipeline');
            }

            if (cursor) {
                await nango.saveCheckpoint({ cursor });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Pipeline');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
