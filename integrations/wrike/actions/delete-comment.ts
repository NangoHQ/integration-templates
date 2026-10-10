import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        commentId: z.string().describe('The ID of the Wrike comment to permanently delete (an opaque string, not the numeric permalink id).')
    })
    .describe('Identifier of the Wrike comment to permanently delete.');

const OutputSchema = z
    .object({
        commentId: z.string().describe('The ID of the comment that was permanently deleted.'),
        deleted: z.boolean().describe('True when the comment was permanently deleted. Wrike comments have no Recycle Bin, so this is final.')
    })
    .describe('Result of the permanent comment deletion.');

/**
 * @tags: [write, destructive]
 * @tagReason: Sends a DELETE to the provider that permanently removes a comment, so it both mutates provider state and is impossible to reverse.
 * @pitfalls: This permanently and irreversibly removes the comment: Wrike keeps no Recycle Bin copy for comments and offers no restore path, unlike folders and tasks.
 */
const action = createAction({
    description: 'Permanently delete a comment.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.wrike.com/reference/deletecommentssingle
        await nango.delete({
            endpoint: `/comments/${encodeURIComponent(input.commentId)}`,
            // Not replayable: a retry after a lost response gets a 404 for the already-removed comment, masking a successful delete.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        return {
            commentId: input.commentId,
            deleted: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
