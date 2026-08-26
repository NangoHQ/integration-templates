import { createAction } from 'nango';
import { z } from 'zod';

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently deletes a macro from the provider account.
 */
const action = createAction({
    description: 'Delete a macro',
    input: z
        .object({
            id: z.number().describe('The unique identifier of the macro to delete')
        })
        .describe('Input payload for deleting a macro'),
    output: z.null().describe('Empty response indicating successful deletion'),
    exec: async (nango, input) => {
        // https://developers.gorgias.com/reference/delete-macro
        await nango.delete({
            endpoint: `/api/macros/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        return null;
    }
});

export default action;
