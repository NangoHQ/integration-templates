import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.number().describe('The ID of the tag to delete.')
    })
    .describe('Input for deleting a tag.');

const OutputSchema = z.null().describe('No content.');

/**
 * @tags: [write, destructive]
 * @tagReason: Deletes a tag from the provider account.
 */
const action = createAction({
    description: 'Delete a tag.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['tags:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        await nango.delete({
            // https://developers.gorgias.com/reference/delete-tag
            endpoint: `/api/tags/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
