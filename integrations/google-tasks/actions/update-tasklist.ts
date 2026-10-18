import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        tasklist: z.string().describe('Task list identifier to update. Example: "MDQwOTY3MjU2NTE0MjcwODI3ODI6MDow"'),
        title: z.string().describe('New title for the task list. Maximum length: 1024 characters. Example: "Groceries"')
    })
    .describe('Input for replacing a task list (full update).');

const ProviderTaskListSchema = z.object({
    kind: z.string().nullish(),
    id: z.string(),
    etag: z.string().nullish(),
    title: z.string().nullish(),
    updated: z.string().nullish(),
    selfLink: z.string().nullish()
});

const OutputSchema = z
    .object({
        kind: z.string().optional().describe('Resource type. Always "tasks#taskList".'),
        id: z.string().describe('Task list identifier.'),
        etag: z.string().optional().describe('ETag of the task list, which changes on every update.'),
        title: z.string().optional().describe('Title of the task list.'),
        updated: z.string().optional().describe('Last modification time of the task list as an RFC 3339 timestamp.'),
        selfLink: z.string().optional().describe('URL pointing to this task list.')
    })
    .describe('The updated task list returned by the provider.');

/**
 * @tags: [write]
 * @tagReason: Replaces the task list's title via a PUT request, mutating provider state.
 * @pitfalls: Passing the @default alias is accepted and renames the user's default task list instead of being rejected, so only pass a concrete list id unless you intend to modify the default list.
 */
const action = createAction({
    description: 'Replace a task list (full update) via PUT.',
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

        const tasklist = ProviderTaskListSchema.parse(response.data);

        return {
            ...(tasklist.kind != null && { kind: tasklist.kind }),
            id: tasklist.id,
            ...(tasklist.etag != null && { etag: tasklist.etag }),
            ...(tasklist.title != null && { title: tasklist.title }),
            ...(tasklist.updated != null && { updated: tasklist.updated }),
            ...(tasklist.selfLink != null && { selfLink: tasklist.selfLink })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
