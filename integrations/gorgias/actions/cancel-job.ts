import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.number().describe('The ID of the job to cancel. Example: 1234')
    })
    .describe('Input for canceling a bulk-operation job');

/**
 * @tags: [write, destructive]
 * @tagReason: Cancels a running or pending bulk-operation job. Changes already applied by a started job are not reverted.
 * @pitfalls: Cancelling a job does not revert changes already made by a started job, and the API returns 400 if the job is already done or canceled.
 */
const action = createAction({
    description: 'Cancel a pending/running bulk-operation job',
    version: '1.0.0',
    input: InputSchema,
    output: z.null().describe('No content response when the job is successfully canceled'),
    scopes: [],

    exec: async (nango, input) => {
        // https://developers.gorgias.com/reference/cancel-job
        await nango.delete({
            endpoint: `/api/jobs/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
