import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.string().describe('The unique identifier of the maintenance window to delete or end.')
    })
    .describe('Input to delete or end a PagerDuty maintenance window by its ID.');

const OutputSchema = z
    .object({
        id: z.string().describe('The unique identifier of the deleted maintenance window.')
    })
    .describe('Output confirming the deleted maintenance window identifier.');

/**
 * @tags: [write, destructive]
 * @tagReason: Deletes a maintenance window permanently and ends in-progress windows early; this cannot be undone.
 * @pitfalls: Calling this on an in-progress window ends it early rather than only working on future-dated ones.
 */
const action = createAction({
    description: 'Delete or end a maintenance window.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['services.write'],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.pagerduty.com/api-reference/
        await nango.delete({
            endpoint: `/maintenance_windows/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        return {
            id: input.id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
