import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    workflowId: z.string().describe('Workflow ID to pause. Example: "6a6b329292e6f649aa6add06"'),
    comment: z.string().describe('Comment message required for the pause action. Example: "Pausing for review"')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Pause an in-progress workflow',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['public.workflows.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developer.ironcladapp.com/reference/pause-workflow
            endpoint: `/public/api/v1/workflows/${encodeURIComponent(input.workflowId)}/pause`,
            data: {
                comment: {
                    message: input.comment
                }
            },
            retries: 3
        };

        await nango.post(config);

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
