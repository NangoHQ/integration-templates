import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    workflowId: z.string().describe('The ID of the workflow to cancel. Example: "6a6b3f753f5ddcadf17daca5"'),
    comment: z.string().describe('The cancellation comment message. Example: "Cancelling per request."')
});

const OutputSchema = z.object({
    workflowId: z.string(),
    cancelled: z.boolean()
});

const action = createAction({
    description: 'Cancel an in-progress workflow.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['public.workflows.cancel'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.ironcladapp.com/reference/cancel-a-workflow
        await nango.post({
            endpoint: `/public/api/v1/workflows/${encodeURIComponent(input.workflowId)}/cancel`,
            data: {
                comment: {
                    message: input.comment
                }
            },
            retries: 3
        });

        return {
            workflowId: input.workflowId,
            cancelled: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
