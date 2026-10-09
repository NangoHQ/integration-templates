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
        success: z
            .boolean()
            .describe(
                'True when TickTick accepted the deletion request; TickTick also returns success for unknown or already-deleted comments, so this does not prove the comment existed.'
            )
    })
    .describe('Result of the comment deletion.');

/**
 * @tags: [write, destructive]
 * @tagReason: Deletes an existing task comment through the provider, a difficult-to-reverse mutation.
 * @pitfalls: Deletion is permanent and cannot be undone, and deleting an unknown or already-deleted comment still returns success, so a successful result does not prove the comment existed.
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
            // Verified live: repeating the delete (or deleting an unknown comment ID) returns 200, so retrying a lost response is safe.
            retries: 3
        });

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
