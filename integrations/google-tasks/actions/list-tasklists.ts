import { z } from 'zod';
import { createAction } from 'nango';

const TaskListSchema = z.object({
    kind: z.string().optional().describe('Resource type; always "tasks#taskList".'),
    id: z.string().describe('Task list identifier.'),
    etag: z.string().optional().describe('ETag of the task list, used for optimistic concurrency.'),
    title: z.string().describe('Title of the task list.'),
    updated: z.string().optional().describe('Last modification time of the task list as an RFC 3339 timestamp.'),
    selfLink: z.string().optional().describe('URL pointing to this task list.')
});

const InputSchema = z
    .object({
        maxResults: z.number().int().positive().max(1000).optional().describe('Maximum number of task lists to return in one page (1-1000). Defaults to 1000.'),
        pageToken: z.string().optional().describe('Token from a previous response nextPageToken to retrieve the next page of task lists.')
    })
    .describe("Pagination options for listing the authenticated user's task lists.");

const OutputSchema = z
    .object({
        items: z.array(TaskListSchema).describe('Task lists owned by the authenticated user.'),
        nextPageToken: z.string().optional().describe('Token to request the next page of task lists; absent when there are no more pages.')
    })
    .describe("A page of the authenticated user's task lists.");

const ProviderResponseSchema = z.object({
    items: z.array(TaskListSchema).optional(),
    nextPageToken: z.string().optional()
});

/**
 * @tags: [read]
 * @tagReason: Only reads the authenticated user's task lists via GET; no provider state is modified.
 * @pitfalls: By default only up to 1000 task lists are returned per call while a user can have up to 2000, so results are incomplete unless you follow nextPageToken.
 */
const action = createAction({
    description: "List all of the user's task lists.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/tasks'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.google.com/workspace/tasks/reference/rest/v1/tasklists/list
            endpoint: '/tasks/v1/users/@me/lists',
            params: {
                ...(input.maxResults !== undefined && { maxResults: input.maxResults }),
                ...(input.pageToken !== undefined && { pageToken: input.pageToken })
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            items: parsed.items ?? [],
            ...(parsed.nextPageToken != null && { nextPageToken: parsed.nextPageToken })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
