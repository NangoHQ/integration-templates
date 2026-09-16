import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        schedule_id: z.string().describe('The ID of the schedule containing the override to delete.'),
        override_id: z.string().describe('The ID of the override to delete.')
    })
    .describe('Input for deleting a schedule override.');

/**
 * @tags: [write, destructive]
 * @tagReason: Deletes a schedule override from PagerDuty.
 */
const action = createAction({
    description: 'Delete a single override from a schedule.',
    version: '1.0.0',
    input: InputSchema,
    output: z.null(),
    scopes: ['write'],

    exec: async (nango, input): Promise<null> => {
        await nango.delete({
            // https://developer.pagerduty.com/api-reference/
            endpoint: `/schedules/${encodeURIComponent(input.schedule_id)}/overrides/${encodeURIComponent(input.override_id)}`,
            retries: 3
        });

        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
