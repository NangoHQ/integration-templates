import { z } from 'zod';
import { createAction } from 'nango';
import { ProviderTaskListSchema, TaskListSchema, toTaskList } from '../helpers/schemas.js';

const InputSchema = z
    .object({
        tasklist: z
            .string()
            .describe(
                'Task list identifier, or the literal alias "@default" for the authenticated user\'s default task list. Example: "@default" or "MDQwOTY3MjU2NTE0MjcwODI3ODI6MDow"'
            )
    })
    .describe('Identifies which task list to retrieve.');

const OutputSchema = TaskListSchema.describe('A Google Tasks task list.');

/**
 * @tags: [read]
 * @tagReason: Retrieves a single task list via a read-only GET and performs no provider mutations.
 * @pitfalls: A malformed id fails with 400 "Invalid task list ID" while a well-formed but deleted list fails with 404 "Task list not found.", so treat both as not-found; the literal "@default" resolves to the user's default list.
 */
const action = createAction({
    description: "Retrieve a single task list by its ID (or the literal alias `@default` for the user's default list).",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/tasks'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.google.com/workspace/tasks/reference/rest/v1/tasklists/get
            endpoint: `/tasks/v1/users/@me/lists/${encodeURIComponent(input.tasklist)}`,
            retries: 3
        });

        return toTaskList(ProviderTaskListSchema.parse(response.data));
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
