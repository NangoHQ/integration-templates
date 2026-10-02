import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({}).describe('No input required. Lists every CRM deal pipeline configured for the account.');

const PipelineStageSchema = z.object({
    id: z.string().describe('Stage ID. Example: "9e577ff7-8e42-4ab3-be26-2b5e01b42518"'),
    name: z.string().describe('Stage name. Example: "New"'),
    winProbability: z.number().optional().describe('Win probability percentage configured for the stage. Example: 20')
});

const PipelineSchema = z.object({
    pipeline: z.string().describe('Pipeline ID (24-character hex string). Example: "5ea675e3da0dd085acaea610"'),
    pipeline_name: z.string().describe('Pipeline name. Example: "Deals Pipeline"'),
    stages: z.array(PipelineStageSchema).describe('Ordered list of stages belonging to the pipeline')
});

const OutputSchema = z
    .object({
        pipelines: z.array(PipelineSchema).describe('List of CRM deal pipelines configured for the account')
    })
    .describe("The account's CRM deal pipelines and their stages.");

/**
 * @tags: [read, write]
 * @tagReason: Primarily reads the account's CRM deal pipelines and their stages, but when no pipelines are configured yet Brevo auto-creates and returns a default pipeline as a side effect of this GET, so it can also change account state (write).
 * @pitfalls: The result is never empty: if no pipelines are configured yet, Brevo automatically creates and returns a default pipeline, so this read-only call can still change account state.
 */
const action = createAction({
    description: "List the account's CRM deal pipelines and their stages.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.brevo.com/reference/get-all-pipelines
        const response = await nango.get({
            endpoint: '/crm/pipeline/details/all',
            retries: 3
        });

        const pipelines = z.array(PipelineSchema).parse(response.data);

        return { pipelines };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
