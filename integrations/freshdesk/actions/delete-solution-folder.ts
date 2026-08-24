import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.number().describe('The unique identifier of the solutions folder to delete. Example: 12345')
    })
    .describe('Input for deleting a solutions folder in Freshdesk.');

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently deletes a solutions folder from Freshdesk.
 * @pitfalls: Deleting a folder permanently deletes all of its translated versions.
 */
const action = createAction({
    description: 'Delete a solutions folder in Freshdesk.',
    version: '1.0.0',
    input: InputSchema,
    output: z.null().describe('A null response indicating the folder was successfully deleted.'),
    scopes: [],

    exec: async (nango, input): Promise<null> => {
        // https://developers.freshdesk.com/api/#delete_solution_folder
        await nango.delete({
            endpoint: `/api/v2/solutions/folders/${encodeURIComponent(String(input.id))}`,
            retries: 3
        });

        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
