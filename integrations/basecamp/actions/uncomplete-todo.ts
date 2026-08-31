import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        projectId: z.number().describe('Project (bucket) ID containing the to-do.'),
        todoId: z.number().describe('To-do ID to mark as not completed.')
    })
    .describe('Input for marking a to-do as not completed.');

/**
 * @tags: [write]
 * @tagReason: Deletes the completion status of a to-do, which is a provider-side mutation.
 * @pitfalls: A 404 may mean the to-do is missing, permission is denied, or the account is inactive; do not assume the to-do does not exist.
 */
const action = createAction({
    description: 'Mark a to-do as not completed.',
    version: '1.0.0',
    input: InputSchema,
    output: z.null().describe('Empty response indicating the to-do was successfully marked as not completed.'),
    scopes: [],

    exec: async (nango, input) => {
        // https://github.com/basecamp/bc3-api/blob/master/sections/todos.md
        await nango.delete({
            endpoint: `/buckets/${encodeURIComponent(input.projectId)}/todos/${encodeURIComponent(input.todoId)}/completion.json`,
            retries: 3
        });
        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
