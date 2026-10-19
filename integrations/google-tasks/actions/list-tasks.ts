import { z } from 'zod';
import { createAction } from 'nango';
import { ProviderTaskSchema, TaskSchema, toTask } from '../helpers/schemas.js';

const InputSchema = z
    .object({
        tasklist: z
            .string()
            .describe('Task list identifier, or "@default" for the authenticated user\'s default list. Example: "MDQwOTY3MjU2NTE0MjcwODI3ODI6MDow".'),
        maxResults: z.number().int().min(1).max(100).optional().describe('Maximum number of tasks to return per page (1-100). Defaults to 20.'),
        cursor: z.string().optional().describe('Pagination cursor from the previous response nextCursor. Omit for the first page.'),
        showCompleted: z.boolean().optional().describe('Whether to return completed tasks. Defaults to true.'),
        showDeleted: z.boolean().optional().describe('Whether to return deleted tasks as tombstones. Defaults to false.'),
        showHidden: z.boolean().optional().describe('Whether to return hidden tasks (completed tasks cleared from a first-party client). Defaults to false.'),
        showAssigned: z.boolean().optional().describe('Whether to return tasks assigned to the user from Docs or Chat Spaces. Defaults to false.'),
        completedMin: z.string().optional().describe("Lower bound (RFC 3339 timestamp) for a task's completion date."),
        completedMax: z.string().optional().describe("Upper bound (RFC 3339 timestamp) for a task's completion date."),
        dueMin: z.string().optional().describe("Lower bound (RFC 3339 timestamp) for a task's due date."),
        dueMax: z.string().optional().describe("Upper bound (RFC 3339 timestamp) for a task's due date."),
        updatedMin: z.string().optional().describe("Lower bound (RFC 3339 timestamp) for a task's last modification time.")
    })
    .describe('Filters and pagination for listing tasks in a task list.');

const OutputSchema = z
    .object({
        items: z.array(TaskSchema).describe('Tasks in the list that match the requested filters.'),
        nextCursor: z.string().optional().describe('Cursor to pass as cursor to fetch the next page; absent when there are no more results.')
    })
    .describe('A page of tasks from a Google Tasks list.');

const ProviderResponseSchema = z.object({
    items: z.array(ProviderTaskSchema).nullish(),
    nextPageToken: z.string().nullish()
});

/**
 * @tags: [read]
 * @tagReason: Reads tasks from a task list without modifying any provider state.
 * @pitfalls: showCompleted defaults to true, so completed tasks are included unless you set it false, and tasks hidden by clearing a list (or completed in a first-party client) appear only when showHidden is also true; maxResults defaults to 20 and caps at 100, so pass nextCursor back as cursor to page through larger lists.
 */
const action = createAction({
    description: 'List tasks in a given task list, with optional filters for completed, hidden, and deleted tasks and date or update ranges.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/tasks'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.google.com/tasks/reference/rest/v1/tasks/list
            endpoint: `/tasks/v1/lists/${encodeURIComponent(input.tasklist)}/tasks`,
            params: {
                ...(input.maxResults !== undefined && { maxResults: input.maxResults }),
                ...(input.cursor !== undefined && { pageToken: input.cursor }),
                ...(input.showCompleted !== undefined && { showCompleted: String(input.showCompleted) }),
                ...(input.showDeleted !== undefined && { showDeleted: String(input.showDeleted) }),
                ...(input.showHidden !== undefined && { showHidden: String(input.showHidden) }),
                ...(input.showAssigned !== undefined && { showAssigned: String(input.showAssigned) }),
                ...(input.completedMin !== undefined && { completedMin: input.completedMin }),
                ...(input.completedMax !== undefined && { completedMax: input.completedMax }),
                ...(input.dueMin !== undefined && { dueMin: input.dueMin }),
                ...(input.dueMax !== undefined && { dueMax: input.dueMax }),
                ...(input.updatedMin !== undefined && { updatedMin: input.updatedMin })
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            items: (parsed.items ?? []).map(toTask),
            ...(parsed.nextPageToken != null && { nextCursor: parsed.nextPageToken })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
