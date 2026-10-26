import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        tasklist: z
            .string()
            .describe('Task list ID that contains the task. Use "@default" for the user\'s default list. Example: "MDQwOTY3MjU2NTE0MjcwODI3ODI6MDow"'),
        task: z.string().describe('Task ID to delete. Example: "YmFJWEFwdXBBTUZ0WkJIdg"')
    })
    .describe('Identifies the task to permanently delete.');

const OutputSchema = z
    .object({
        id: z.string().describe('ID of the task that was deleted.'),
        tasklist: z.string().describe('ID of the task list the task was deleted from.'),
        deleted: z
            .boolean()
            .describe('True once the provider confirms the deletion. A later fetch of the same task returns a tombstone with deleted set to true.')
    })
    .describe('Confirmation that the task was deleted.');

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently deletes a task through the provider; the deletion cannot be undone.
 * @pitfalls: Deletion is irreversible and the task is not gone from later reads: a follow-up get returns 200 with deleted:true (a tombstone) rather than 404, and it still appears in list-tasks when showDeleted=true. Deleting an already-deleted task still reports success, while a malformed task id returns 400 and a valid id not in the given list returns 404.
 */
const action = createAction({
    description: 'Permanently delete a task from a task list.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/tasks'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        await nango.delete({
            // https://developers.google.com/tasks/reference/rest/v1/tasks/delete
            endpoint: `/tasks/v1/lists/${encodeURIComponent(input.tasklist)}/tasks/${encodeURIComponent(input.task)}`,
            // DELETE is idempotent here: deleting an already-deleted task still returns 204.
            retries: 3
        });

        return {
            id: input.task,
            tasklist: input.tasklist,
            deleted: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
