import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.number().describe('The unique identifier of the discussion forum to delete.')
    })
    .describe('Input for deleting a Freshdesk discussion forum.');

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently removes the specified discussion forum from Freshdesk.
 */
const action = createAction({
    description: 'Delete a discussion forum in Freshdesk.',
    version: '1.0.0',
    input: InputSchema,
    output: z.null().describe('Empty response confirming the forum was deleted.'),
    scopes: [],

    exec: async (nango, input): Promise<null> => {
        // https://developers.freshdesk.com/api/#delete_a_forum
        await nango.delete({
            endpoint: `/api/v2/discussions/forums/${encodeURIComponent(String(input.id))}`,
            retries: 3
        });

        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
