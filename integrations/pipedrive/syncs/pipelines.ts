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
    models: {
        Pipeline: PipelineSchema
    },

    exec: async (nango) => {
        // Delete tracking requires full enumeration — never resume from a saved cursor
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
                type: 'cursor',
                cursor_name_in_request: 'cursor',
                cursor_path_in_response: 'additional_data.next_cursor',
                response_path: 'data',
                limit_name_in_request: 'limit',
                limit: 500
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
        }

        await nango.trackDeletesEnd('Pipeline');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
