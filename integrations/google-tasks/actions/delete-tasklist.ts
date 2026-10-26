import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        tasklist: z
            .string()
            .describe('Task list ID to delete, or "@default" for the authenticated user\'s default list. Example: "MDQwOTY3MjU2NTE0MjcwODI3ODI6MDow"')
    })
    .describe('Identifies the task list to permanently delete.');

const OutputSchema = z
    .object({
        id: z.string().describe('Identifier passed to the action: the deleted task list ID, or the "@default" alias if one was supplied.'),
        deleted: z.boolean().describe('True when the provider confirmed the deletion with a 204 No Content response.')
    })
    .describe('Result of the task list deletion.');

/**
 * @tags: [write, destructive]
 * @tagReason: Deletes the task list and every task inside it, which is a difficult-to-reverse provider mutation.
 * @pitfalls: Deletion is permanent and cascades to every task in the list; an invalid list ID fails with 400, while deleting an already-deleted list still succeeds (204) because the operation is idempotent.
 */
const action = createAction({
    description: 'Permanently delete a task list and every task inside it.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/tasks'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://developers.google.com/tasks/reference/rest/v1/tasklists/delete
            endpoint: `/tasks/v1/users/@me/lists/${encodeURIComponent(input.tasklist)}`,
            // Safe to retry: deleting an already-deleted list still returns 204, so the operation is idempotent.
            retries: 3
        });

        return {
            id: input.tasklist,
            deleted: response.status === 204
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
