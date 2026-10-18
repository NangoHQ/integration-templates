import { z } from 'zod';
import { createAction } from 'nango';

const TaskLinkSchema = z
    .object({
        type: z.string().optional().describe('Link type, for example "email", "generic", "chat_message", or "keep_note".'),
        description: z.string().optional().describe('Human-readable description of the link; may be empty.'),
        link: z.string().optional().describe('The link URL.')
    })
    .describe('A read-only link attached to a task.');

const AssignmentInfoSchema = z
    .object({
        linkToTask: z.string().optional().describe('Absolute link to the original task in the surface it was assigned from.'),
        surfaceType: z.string().optional().describe('Surface the task was assigned from, for example "DOCUMENT" or "SPACE".'),
        driveResourceInfo: z
            .object({
                driveFileId: z.string().optional().describe('Identifier of the Drive file the task was assigned from.'),
                resourceKey: z.string().optional().describe('Resource key required to access files shared via a shared link.')
            })
            .optional()
            .describe('Drive file information when the task was assigned from a Google Doc.'),
        spaceInfo: z
            .object({
                space: z.string().optional().describe('Chat space the task originates from, formatted as "spaces/{space}".')
            })
            .optional()
            .describe('Chat Space information when the task was assigned from a Google Chat space.')
    })
    .describe('Context for a task assigned to the user from Docs or Chat Spaces.');

const TaskSchema = z
    .object({
        id: z.string().describe('Task identifier.'),
        etag: z.string().optional().describe('ETag of the task resource.'),
        title: z.string().optional().describe('Title of the task.'),
        updated: z.string().optional().describe('Last modification time of the task (RFC 3339 timestamp).'),
        selfLink: z.string().optional().describe('URL pointing to this task.'),
        parent: z.string().optional().describe('Parent task identifier; omitted for top-level tasks.'),
        position: z.string().optional().describe('Lexicographic position of the task among its siblings.'),
        notes: z.string().optional().describe('Notes describing the task.'),
        status: z.string().optional().describe('Task status: "needsAction" or "completed".'),
        due: z.string().optional().describe('Due date of the task (RFC 3339 timestamp; the time portion is not stored).'),
        completed: z.string().optional().describe('Completion date of the task (RFC 3339 timestamp); omitted when not completed.'),
        deleted: z.boolean().optional().describe('True when the task has been deleted; returned only when showDeleted is true.'),
        hidden: z.boolean().optional().describe('True when the task was hidden by clearing the list; returned only when showHidden is true.'),
        links: z.array(TaskLinkSchema).optional().describe('Read-only links attached to the task.'),
        webViewLink: z.string().optional().describe('Absolute link to the task in the Google Tasks web UI.'),
        assignmentInfo: AssignmentInfoSchema.optional().describe('Context for tasks assigned from Docs or Chat Spaces.')
    })
    .describe('A task in a Google Tasks list.');

const InputSchema = z
    .object({
        tasklist: z
            .string()
            .describe('Task list identifier, or "@default" for the authenticated user\'s default list. Example: "MDQwOTY3MjU2NTE0MjcwODI3ODI6MDow".'),
        maxResults: z.number().int().min(1).max(100).optional().describe('Maximum number of tasks to return per page (1-100). Defaults to 20.'),
        pageToken: z.string().optional().describe('Pagination token returned as nextPageToken by a previous call. Omit for the first page.'),
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
        nextPageToken: z.string().optional().describe('Token to fetch the next page; absent when there are no more results.')
    })
    .describe('A page of tasks from a Google Tasks list.');

const ListTasksResponseSchema = z.object({
    items: z.array(TaskSchema).optional(),
    nextPageToken: z.string().optional()
});

/**
 * @tags: [read]
 * @tagReason: Reads tasks from a task list without modifying any provider state.
 * @pitfalls: showCompleted defaults to true, so completed tasks are included unless you set it false, and tasks hidden by clearing a list (or completed in a first-party client) appear only when showHidden is also true; maxResults defaults to 20 and caps at 100, so pass nextPageToken to page through larger lists.
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
                ...(input.pageToken !== undefined && { pageToken: input.pageToken }),
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

        const parsed = ListTasksResponseSchema.parse(response.data);

        return {
            items: parsed.items ?? [],
            ...(parsed.nextPageToken !== undefined && { nextPageToken: parsed.nextPageToken })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
