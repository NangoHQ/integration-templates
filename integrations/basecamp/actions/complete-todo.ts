import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        projectId: z.number().describe('The project (bucket) ID the to-do belongs to.'),
        todoId: z.number().describe('The ID of the to-do to mark as completed.')
    })
    .describe('Input to mark a to-do as completed.');

/**
 * @tags: [write]
 * @tagReason: Mutates a to-do by marking it as completed on the provider.
 * @pitfalls: A 404 can mean a missing to-do, insufficient permissions, or an inactive account subscription.
 */
const action = createAction({
    description: 'Mark a to-do as completed.',
    version: '1.0.0',
    input: InputSchema,
    output: z.null().describe('Empty response on success.'),
    scopes: [],

    exec: async (nango, input) => {
        // https://github.com/basecamp/bc3-api/blob/master/sections/todos.md
        await nango.post({
            endpoint: `/buckets/${encodeURIComponent(input.projectId)}/todos/${encodeURIComponent(input.todoId)}/completion.json`,
            retries: 3
        });

        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
