import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.number().int().describe('Unique ID of the forum category to delete. Example: 3')
    })
    .describe('Input to delete a discussion forum category in Freshdesk');

/**
 * @tags: [write, destructive]
 * @tagReason: Deletes a discussion forum category from Freshdesk.
 */
const action = createAction({
    description: 'Delete a discussion forum category in Freshdesk',
    version: '1.0.0',
    input: InputSchema,
    output: z.null().describe('Empty response indicating the forum category was successfully deleted'),

    exec: async (nango, input): Promise<null> => {
        await nango.delete({
            // https://developers.freshdesk.com/api/#delete_a_discussion_category
            endpoint: `/api/v2/discussions/categories/${encodeURIComponent(String(input.id))}`,
            retries: 1
        });

        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
