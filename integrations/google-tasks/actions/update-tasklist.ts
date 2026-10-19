import { z } from 'zod';
import { createAction } from 'nango';
import { ProviderTaskListSchema, TaskListSchema, toTaskList } from '../helpers/schemas.js';

const InputSchema = z
    .object({
        tasklist: z.string().describe('Task list identifier to rename, or "@default" for the primary list. Example: "MDQwOTY3MjU2NTE0MjcwODI3ODI6MDow"'),
        title: z.string().describe('New title for the task list. Maximum length: 1024 characters. Example: "Groceries"')
    })
    .describe('Input for renaming a task list.');

const OutputSchema = TaskListSchema.describe('The updated task list returned by the provider.');

/**
 * @tags: [write]
 * @tagReason: Replaces the task list's title via a PUT request, mutating provider state.
 * @pitfalls: Passing the @default alias is accepted and renames the user's default task list instead of being rejected, so only pass a concrete list id unless you intend to modify the default list.
 */
const action = createAction({
    description: 'Rename a task list. The title is the only writable task list field, so this full PUT update only changes the title.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/tasks'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://developers.google.com/workspace/tasks/reference/rest/v1/tasklists/update
            endpoint: `/tasks/v1/users/@me/lists/${encodeURIComponent(input.tasklist)}`,
            data: {
                id: input.tasklist,
                title: input.title
            },
            retries: 3
        });

        return toTaskList(ProviderTaskListSchema.parse(response.data));
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
