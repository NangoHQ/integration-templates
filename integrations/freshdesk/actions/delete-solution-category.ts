import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.number().describe('The unique identifier of the solution category to delete. Example: 123')
    })
    .describe('Input for deleting a Freshdesk solution category.');

const OutputSchema = z.null().describe('Empty response confirming the solution category was deleted.');

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently removes the solution category from Freshdesk.
 * @pitfalls: Deleting a category permanently removes all of its translated versions.
 */
const action = createAction({
    description: 'Delete a solutions category in Freshdesk.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.freshdesk.com/api/#delete_a_solution_category
        await nango.delete({
            endpoint: `/api/v2/solutions/categories/${encodeURIComponent(String(input.id))}`,
            retries: 10
        });

        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
