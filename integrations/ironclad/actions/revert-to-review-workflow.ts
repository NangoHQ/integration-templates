import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    workflowId: z.string().describe('The unique identifier or Ironclad ID of the workflow to revert. Example: "6013609108b8f070cee94fc1"')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Send a workflow at its Sign step back to the Review step.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['public.workflows.revertToReview'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.ironcladapp.com/reference/revert-to-review
        const response = await nango.patch({
            endpoint: `/public/api/v1/workflows/${encodeURIComponent(input.workflowId)}/revert-to-review`,
            retries: 10
        });

        if (response.status !== 204) {
            throw new nango.ActionError({
                type: 'revert_failed',
                message: `Unexpected status code ${response.status} when reverting workflow to review.`,
                workflowId: input.workflowId
            });
        }

        return { success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
