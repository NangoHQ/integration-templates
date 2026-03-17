import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    objectType: z.string().optional().describe('The object type for which to fetch pipelines (e.g., "deals", "tickets"). Defaults to "deals".')
});

const StageSchema = z.object({
    id: z.string(),
    label: z.string().optional(),
    displayOrder: z.number().optional(),
    metadata: z.record(z.string(), z.any()).optional()
});

const PipelineSchema = z.object({
    id: z.string(),
    label: z.string().optional(),
    displayOrder: z.number().optional(),
    active: z.boolean().optional(),
    stages: z.array(StageSchema),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional()
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
        const objectType = input.objectType || 'deals';

        // https://developers.hubspot.com/docs/api/crm/pipelines
        const response = await nango.get({
            endpoint: `/crm/v3/pipelines/${objectType}`,
            retries: 3
        });

        const pipelines = response.data.results || [];

        return {
            pipelines: pipelines.map((pipeline: any) => ({
                id: pipeline.id,
                label: pipeline.label ?? undefined,
                displayOrder: pipeline.displayOrder ?? undefined,
                active: pipeline.active ?? undefined,
                stages: (pipeline.stages || []).map((stage: any) => ({
                    id: stage.id,
                    label: stage.label ?? undefined,
                    displayOrder: stage.displayOrder ?? undefined,
                    metadata: stage.metadata || {}
                })),
                createdAt: pipeline.createdAt ?? undefined,
                updatedAt: pipeline.updatedAt ?? undefined
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
