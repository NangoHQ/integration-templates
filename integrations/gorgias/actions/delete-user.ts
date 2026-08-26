import { createAction } from 'nango';
import { z } from 'zod';

const InputSchema = z
    .object({
        id: z.number().describe('The unique identifier of the user to delete')
    })
    .describe('Input for deleting a user in Gorgias');

/**
 * @tags: [write, destructive]
 * @tagReason: Deletes a user permanently from the Gorgias account.
 * @pitfalls: Requires a connection with the users:write scope; deleting the connection owner permanently invalidates the connection and prevents further API calls.
 */
const action = createAction({
    description: 'Delete a user in Gorgias.',
    input: InputSchema,
    output: z.null(),
    scopes: ['users:write'],
    exec: async (nango, input) => {
        // https://developers.gorgias.com/reference/delete-user
        await nango.delete({
            endpoint: `/api/users/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        return null;
    }
});

export default action;
