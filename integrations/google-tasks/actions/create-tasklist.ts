import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        title: z.string().describe('Title of the task list to create. Maximum length is 1024 characters. Example: "My Tasks"')
    })
    .describe('Input for creating a new task list.');

const ProviderTaskListSchema = z.object({
    kind: z.string().optional(),
    id: z.string(),
    etag: z.string().optional(),
    title: z.string(),
    updated: z.string().optional(),
    selfLink: z.string().optional()
});

const OutputSchema = z
    .object({
        kind: z.string().optional().describe('Type of the resource. Always "tasks#taskList". Example: "tasks#taskList"'),
        id: z.string().describe('Unique identifier of the created task list. Example: "MDQwOTY3MjU2NTE0MjcwODI3ODI6MDow"'),
        etag: z.string().optional().describe('ETag of the task list, used to detect changes to the resource. Example: "\\"tEg8T0EO6cI\\""'),
        title: z.string().describe('Title of the created task list. Example: "My Tasks"'),
        updated: z.string().optional().describe('Last modification time of the task list as an RFC 3339 timestamp. Example: "2025-11-11T21:17:21.284Z"'),
        selfLink: z
            .string()
            .optional()
            .describe(
                'URL that can be used to retrieve, update, or delete this task list. Example: "https://tasks.googleapis.com/tasks/v1/users/@me/lists/MDQwOTY3MjU2NTE0MjcwODI3ODI6MDow"'
            )
    })
    .describe('The newly created task list, including its provider-assigned ID and timestamps.');

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

        const taskList = ProviderTaskListSchema.parse(response.data);

        return {
            ...(taskList.kind != null && { kind: taskList.kind }),
            id: taskList.id,
            ...(taskList.etag != null && { etag: taskList.etag }),
            title: taskList.title,
            ...(taskList.updated != null && { updated: taskList.updated }),
            ...(taskList.selfLink != null && { selfLink: taskList.selfLink })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
