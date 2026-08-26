import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        ids: z
            .array(z.number().describe('Unique identifier of a tag to delete. Example: 1812976'))
            .min(1)
            .describe('List of tag IDs to delete. Must contain at least one ID.')
    })
    .describe('Input to delete multiple tags in a single bulk call.');

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently deletes multiple tags from the provider in a single call.
 */
const action = createAction({
    description: 'Delete multiple tags in one call.',
    version: '1.0.0',
    input: InputSchema,
    output: z.null().describe('No meaningful response body on success.'),

    exec: async (nango, input) => {
        // https://developers.gorgias.com/reference/delete-tags
        await nango.delete({
            endpoint: '/api/tags',
            data: {
                ids: input.ids
            },
            retries: 3
        });

        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
