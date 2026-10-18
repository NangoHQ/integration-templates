import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        tasklistId: z
            .string()
            .describe('Identifier of the task list to rename, or the alias "@default" for the primary list. Example: "MDQwOTY3MjU2NTE0MjcwODI3ODI6MDow"'),
        title: z.string().describe('New title for the task list. Maximum length: 1024 characters. Example: "Project Tasks"')
    })
    .describe('Request to rename a task list.');

const ProviderTaskListSchema = z.object({
    id: z.string(),
    title: z.string().optional(),
    updated: z.string().optional(),
    etag: z.string().optional(),
    selfLink: z.string().optional()
});

const OutputSchema = z
    .object({
        id: z.string().describe('Identifier of the renamed task list. Example: "MDQwOTY3MjU2NTE0MjcwODI3ODI6MDow"'),
        title: z.string().optional().describe('Updated title of the task list. Example: "Project Tasks"'),
        updated: z.string().optional().describe('Last modification time of the task list as an RFC 3339 timestamp. Example: "2025-11-11T21:17:21.284Z"'),
        etag: z.string().optional().describe('ETag of the task list resource. Example: "\\"tEg8T0EO6cI\\""'),
        selfLink: z
            .string()
            .optional()
            .describe('URL pointing to this task list. Example: "https://www.googleapis.com/tasks/v1/users/@me/lists/MDQwOTY3MjU2NTE0MjcwODI3ODI6MDow"')
    })
    .describe('The task list after the rename.');

/**
 * @tags: [write]
 * @tagReason: Renames an existing task list through the provider, mutating stored provider state.
 * @pitfalls: Passing the "@default" alias renames the account's primary task list, not a list literally named "@default"; an unknown or malformed list id returns HTTP 400 while a since-deleted list id returns HTTP 404, so "not found" is not signalled by a single status code.
 */
const action = createAction({
    description: 'Rename a task list.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/tasks/reference/rest/v1/tasklists/patch
        const response = await nango.patch({
            endpoint: `/tasks/v1/users/@me/lists/${encodeURIComponent(input.tasklistId)}`,
            data: {
                title: input.title
            },
            retries: 3
        });

        const tasklist = ProviderTaskListSchema.parse(response.data);

        return {
            id: tasklist.id,
            ...(tasklist.title != null && { title: tasklist.title }),
            ...(tasklist.updated != null && { updated: tasklist.updated }),
            ...(tasklist.etag != null && { etag: tasklist.etag }),
            ...(tasklist.selfLink != null && { selfLink: tasklist.selfLink })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
