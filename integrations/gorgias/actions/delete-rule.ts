import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.number().describe('The unique identifier of the rule to delete.')
    })
    .describe('Input for deleting a rule by its ID.');

/**
 * @tags: [write, destructive]
 * @tagReason: Deletes a rule permanently from the provider.
 * @pitfalls: Deletion is permanent and cannot be undone.
 */
const action = createAction({
    description: 'Delete a rule.',
    version: '1.0.0',
    input: InputSchema,
    output: z.null(),

    exec: async (nango, input): Promise<null> => {
        await nango.delete({
            // https://developers.gorgias.com/reference/delete-rule
            endpoint: `/api/rules/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
