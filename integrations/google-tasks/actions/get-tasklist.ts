import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        tasklist: z
            .string()
            .describe(
                'Task list identifier, or the literal alias "@default" for the authenticated user\'s default task list. Example: "@default" or "MDQwOTY3MjU2NTE0MjcwODI3ODI6MDow"'
            )
    })
    .describe('Identifies which task list to retrieve.');

const ProviderTaskListSchema = z.object({
    kind: z.string().optional(),
    id: z.string(),
    etag: z.string().optional(),
    title: z.string().optional(),
    updated: z.string().optional(),
    selfLink: z.string().optional()
});

const OutputSchema = z
    .object({
        kind: z.string().optional().describe('Resource type. Always "tasks#taskList". Example: "tasks#taskList"'),
        id: z.string().describe('Task list identifier. Example: "MDQwOTY3MjU2NTE0MjcwODI3ODI6MDow"'),
        etag: z.string().optional().describe('ETag of the task list, useful for detecting concurrent modifications.'),
        title: z.string().optional().describe('Title of the task list. Example: "My Tasks"'),
        updated: z.string().optional().describe('Last modification time of the task list as an RFC 3339 timestamp. Example: "2025-11-11T21:17:21.284Z"'),
        selfLink: z.string().optional().describe('URL pointing to this task list, usable to retrieve, update, or delete it.')
    })
    .describe('A Google Tasks task list.');

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

        const taskList = ProviderTaskListSchema.parse(response.data);

        return {
            ...(taskList.kind != null && { kind: taskList.kind }),
            id: taskList.id,
            ...(taskList.etag != null && { etag: taskList.etag }),
            ...(taskList.title != null && { title: taskList.title }),
            ...(taskList.updated != null && { updated: taskList.updated }),
            ...(taskList.selfLink != null && { selfLink: taskList.selfLink })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
