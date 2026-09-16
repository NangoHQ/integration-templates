import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.string().describe('The unique identifier of the schedule to delete.')
    })
    .describe('Input parameters for deleting a PagerDuty schedule.');

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently deletes a schedule from the PagerDuty account.
 */
const action = createAction({
    description: 'Delete a schedule.',
    version: '1.0.0',
    input: InputSchema,
    output: z.null().describe('Empty response confirming the schedule was deleted.'),
    exec: async (nango, input): Promise<null> => {
        await nango.delete({
            // https://developer.pagerduty.com/api-reference/reference/REST/openapiv3.json/paths/~1schedules~1%7Bid%7D/delete
            endpoint: `/schedules/${encodeURIComponent(input.id)}`,
            retries: 3
        });
        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
