import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        muralId: z.string().describe('Unique identifier of the mural that contains the tag. Example: "nangodev4776.1791984276717"'),
        tagId: z.string().describe('Unique identifier of the tag to delete. Example: "tag-1791996397016"')
    })
    .describe('Identifies the tag to permanently delete and the mural it belongs to.');

const OutputSchema = z
    .object({
        muralId: z.string().describe('Unique identifier of the mural the tag was removed from. Example: "nangodev4776.1791984276717"'),
        tagId: z.string().describe('Unique identifier of the tag that was permanently deleted. Example: "tag-1791996397016"'),
        deleted: z.boolean().describe('True once the provider confirms the tag no longer exists.')
    })
    .describe('Confirmation that the tag was deleted from the mural.');

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently deletes a tag from a mural through the provider API.
 * @pitfalls: Deletion is permanent and cannot be undone (Mural has no recycle bin); deleting an unknown or already-removed tag fails with a 404.
 */
const action = createAction({
    description: 'Permanently delete a tag from a mural.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['murals:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        await nango.delete({
            // https://developers.mural.co/public/reference/deletemuraltag
            endpoint: `/api/public/v1/murals/${encodeURIComponent(input.muralId)}/tags/${encodeURIComponent(input.tagId)}`,
            // DELETE is idempotent: re-issuing it after a lost response cannot create a duplicate side effect.
            retries: 3
        });

        return {
            muralId: input.muralId,
            tagId: input.tagId,
            deleted: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
