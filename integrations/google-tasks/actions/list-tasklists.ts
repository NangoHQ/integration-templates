import { z } from 'zod';
import { createAction } from 'nango';
import { ProviderTaskListSchema, TaskListSchema, toTaskList } from '../helpers/schemas.js';

const InputSchema = z
    .object({
        maxResults: z.number().int().positive().max(1000).optional().describe('Maximum number of task lists to return in one page (1-1000). Defaults to 1000.'),
        cursor: z.string().optional().describe('Pagination cursor from the previous response nextCursor. Omit for the first page.')
    })
    .describe("Pagination options for listing the authenticated user's task lists.");

const OutputSchema = z
    .object({
        items: z.array(TaskListSchema).describe('Task lists owned by the authenticated user.'),
        nextCursor: z.string().optional().describe('Cursor to pass as cursor to fetch the next page; absent when there are no more pages.')
    })
    .describe("A page of the authenticated user's task lists.");

const ProviderResponseSchema = z.object({
    items: z.array(ProviderTaskListSchema).nullish(),
    nextPageToken: z.string().nullish()
});

/**
 * @tags: [read]
 * @tagReason: Only reads the authenticated user's task lists via GET; no provider state is modified.
 * @pitfalls: By default only up to 1000 task lists are returned per call while a user can have up to 2000, so results are incomplete unless you follow nextCursor.
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
                ...(input.cursor !== undefined && { pageToken: input.cursor })
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            items: (parsed.items ?? []).map(toTaskList),
            ...(parsed.nextPageToken != null && { nextCursor: parsed.nextPageToken })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
