import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    workflowId: z.string().describe('Workflow ID to resume. Example: "6a6b329292e6f649aa6add06"'),
    comment: z
        .object({
            message: z.string().describe('Comment message to include with the resume action.')
        })
        .describe('Required comment for resuming the workflow.')
});

const OutputSchema = z.object({
    workflowId: z.string(),
    resumed: z.boolean()
});

const action = createAction({
    description: 'Resume a paused workflow.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['public.workflows.pauseAndResume'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developer.ironcladapp.com/
            endpoint: `/public/api/v1/workflows/${encodeURIComponent(input.workflowId)}/resume`,
            data: {
                comment: {
                    message: input.comment.message
                }
            },
            retries: 3
        };

        await nango.post(config);

        return {
            workflowId: input.workflowId,
            resumed: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
