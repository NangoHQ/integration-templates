import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        projectId: z.string().describe('Identifier of the project that contains the task. Example: "6226ff9877acee87727f6bca"'),
        taskId: z.string().describe('Identifier of the task whose comment should be deleted. Example: "63b7bebb91c0a5474805fcd4"'),
        commentId: z.string().describe('Identifier of the comment to delete. Example: "comment-1"')
    })
    .describe('Identifiers of the task comment to delete.');

const OutputSchema = z
    .object({
        success: z.boolean().describe('True when the comment was deleted.')
    })
    .describe('Result of the comment deletion.');

/**
 * @tags: [write, destructive]
 * @tagReason: Deletes an existing task comment through the provider, a difficult-to-reverse mutation.
 * @pitfalls: Deletion is permanent and cannot be undone, and deleting an unknown or already-deleted comment returns a 404 error rather than succeeding idempotently.
 */
const action = createAction({
    description: 'Delete a comment from a task.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['tasks:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.ticktick.com/docs/openapi.md#delete-task-comment
        await nango.delete({
            endpoint: `/open/v1/project/${encodeURIComponent(input.projectId)}/task/${encodeURIComponent(input.taskId)}/comment/${encodeURIComponent(input.commentId)}`,
            // DELETE is idempotent, so retrying a lost response is safe.
            retries: 3
        });

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
