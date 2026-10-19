import { z } from 'zod';
import { createAction } from 'nango';
import { ProviderTaskListSchema, TaskListSchema, toTaskList } from '../helpers/schemas.js';

const InputSchema = z
    .object({
        title: z.string().describe('Title of the task list to create. Maximum length is 1024 characters. Example: "My Tasks"')
    })
    .describe('Input for creating a new task list.');

const OutputSchema = TaskListSchema.describe('The newly created task list, including its provider-assigned ID and timestamps.');

/**
 * @tags: [write]
 * @tagReason: Creates a new task list on the provider account.
 * @pitfalls: Titles are not deduplicated, so calling this twice with the same title creates two separate lists with distinct IDs; an account can hold at most 2000 task lists.
 */
const action = createAction({
    description: 'Create a new, empty task list.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/tasks'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/tasks/reference/rest/v1/tasklists/insert
        const response = await nango.post({
            endpoint: '/tasks/v1/users/@me/lists',
            data: {
                title: input.title
            },
            // Create is not idempotent: a retry after a lost response would create a duplicate list.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        return toTaskList(ProviderTaskListSchema.parse(response.data));
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
