import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.number().describe('The unique identifier of the view to delete. Example: 1234567')
    })
    .describe('Input parameters for deleting a Gorgias view.');

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently removes a view from the account. This action cannot be undone.
 * @pitfalls: System views such as Trash or Spam cannot be deleted; only user-created views are eligible.
 */
const action = createAction({
    description: 'Delete a view.',
    version: '1.0.0',
    input: InputSchema,
    output: z.null(),
    scopes: ['views:write'],

    exec: async (nango, input): Promise<null> => {
        // https://developers.gorgias.com/reference/delete-view
        await nango.delete({
            endpoint: `/api/views/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
