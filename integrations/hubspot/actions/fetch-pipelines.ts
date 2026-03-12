import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    object_type: z.string().optional().describe('The object type for which to fetch pipelines (e.g., "deals", "tickets"). Defaults to "deals".')
});

const StageSchema = z.object({
    id: z.string(),
    label: z.union([z.string(), z.null()]),
    display_order: z.union([z.number(), z.null()]),
    metadata: z.record(z.string(), z.any()).optional()
});

const PipelineSchema = z.object({
    id: z.string(),
    label: z.union([z.string(), z.null()]),
    display_order: z.union([z.number(), z.null()]),
    active: z.union([z.boolean(), z.null()]),
    stages: z.array(StageSchema),
    created_at: z.union([z.string(), z.null()]),
    updated_at: z.union([z.string(), z.null()])
});

const OutputSchema = z.object({
    pipelines: z.array(PipelineSchema)
});

const action = createAction({
    description: 'List pipelines and stages for an object type, defaulting to deals',
    version: '1.0.0',

    endpoint: {
        method: 'GET',
        path: '/actions/fetch-pipelines',
        group: 'Pipelines'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['crm.objects.deals.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const objectType = input.object_type || 'deals';

        // https://developers.hubspot.com/docs/api/crm/pipelines
        const response = await nango.get({
            endpoint: `/crm/v3/pipelines/${objectType}`,
            retries: 3
        });

        const pipelines = response.data.results || [];

        return {
            pipelines: pipelines.map((pipeline: any) => ({
                id: pipeline.id,
                label: pipeline.label ?? null,
                display_order: pipeline.displayOrder ?? null,
                active: pipeline.active ?? null,
                stages: (pipeline.stages || []).map((stage: any) => ({
                    id: stage.id,
                    label: stage.label ?? null,
                    display_order: stage.displayOrder ?? null,
                    metadata: stage.metadata || {}
                })),
                created_at: pipeline.createdAt ?? null,
                updated_at: pipeline.updatedAt ?? null
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
