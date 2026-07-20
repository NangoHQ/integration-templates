import { z } from 'zod';
import { createAction } from 'nango';

const PipelineStageSchema = z.object({
    id: z.string().describe('Stage ID. Example: "7915dedc-8f18-44d5-8bc3-77c04e994a10"'),
    name: z.string().describe('Stage name. Example: "New Lead"'),
    position: z.number().optional().describe('Stage position in the pipeline.')
});

const PipelineSchema = z.object({
    id: z.string().describe('Pipeline ID. Example: "alX8AvUfLBKkXH2pZNkl"'),
    name: z.string().describe('Pipeline name. Example: "Marketing Pipeline"'),
    stages: z.array(PipelineStageSchema).describe('Stages within the pipeline.'),
    showInFunnel: z.boolean().optional().describe('Whether the pipeline is shown in funnel views.'),
    showInPieChart: z.boolean().optional().describe('Whether the pipeline is shown in pie chart views.'),
    locationId: z.string().optional().describe('Location ID associated with the pipeline.'),
    colorRenderMode: z.string().optional().describe('How pipeline/stage colors are rendered.')
});

const InputSchema = z.object({
    locationId: z.string().describe('Location ID. Example: "AYg6rIXHN1fXdXjGcYvI"')
});

const OutputSchema = z.object({
    pipelines: z.array(PipelineSchema).describe('List of opportunity pipelines for the location.')
});

const action = createAction({
    description: 'List opportunity pipelines and their stages for a location.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['opportunities.readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://highlevel.stoplight.io/docs/integrations/0b68d0602f6d1-get-pipelines
            endpoint: '/opportunities/pipelines',
            params: {
                locationId: input.locationId
            },
            headers: {
                Version: '2021-07-28'
            },
            retries: 3
        });

        const parsed = z
            .object({
                pipelines: z.array(z.unknown())
            })
            .parse(response.data);

        const pipelines = parsed.pipelines.map((pipeline: unknown) => {
            const validatedPipeline = PipelineSchema.parse(pipeline);
            return validatedPipeline;
        });

        return {
            pipelines
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
