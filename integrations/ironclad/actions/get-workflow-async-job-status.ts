import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    jobId: z.string().describe('The async job ID returned by create-workflow-async. Example: "abc123"')
});

const OutputSchema = z
    .object({
        asyncJobId: z.string().optional(),
        status: z.string(),
        asyncJobStatusUrl: z.string().optional(),
        workflow: z.unknown().optional()
    })
    .passthrough();

const action = createAction({
    description: 'Check the status of an asynchronous workflow-creation job and retrieve the created workflow once done.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['public.workflows.create'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.ironcladapp.com/
            endpoint: `/public/api/v1/workflows/async/${encodeURIComponent(input.jobId)}`,
            retries: 3
        });

        const providerJob = OutputSchema.parse(response.data);

        return providerJob;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
