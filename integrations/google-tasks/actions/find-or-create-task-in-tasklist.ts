import { z } from 'zod';
import { createAction } from 'nango';

const TaskListSchema = z.object({
    id: z.string().describe('Task list identifier.'),
    title: z.string().describe('Title of the task list.'),
    updated: z.string().optional().describe('Last modification time of the task list as an RFC 3339 timestamp.'),
    selfLink: z.string().optional().describe('URL pointing to this task list.'),
    etag: z.string().optional().describe('ETag of the task list.')
});

const TaskListsResponseSchema = z.object({
    items: z.array(TaskListSchema).optional(),
    nextPageToken: z.string().optional()
});

const TaskSchema = z.object({
    id: z.string().describe('Task identifier.'),
    title: z.string().describe('Title of the task.'),
    notes: z.string().optional().describe('Notes describing the task.'),
    status: z.string().optional().describe('Task status: "needsAction" or "completed".'),
    due: z.string().optional().describe('Due date as an RFC 3339 timestamp. Only the date portion is stored.'),
    completed: z.string().optional().describe('Completion date as an RFC 3339 timestamp, present only if the task is completed.'),
    deleted: z.boolean().optional().describe('Whether the task has been deleted.'),
    hidden: z.boolean().optional().describe('Whether the task is hidden because it was completed when the list was last cleared.'),
    parent: z.string().optional().describe('Identifier of the parent task when this is a subtask.'),
    position: z.string().optional().describe('String indicating the position of the task among its siblings.'),
    updated: z.string().optional().describe('Last modification time of the task as an RFC 3339 timestamp.'),
    selfLink: z.string().optional().describe('URL pointing to this task.'),
    webViewLink: z.string().optional().describe('Absolute link to the task in the Google Tasks web UI.'),
    etag: z.string().optional().describe('ETag of the task.')
});

const InputSchema = z
    .object({
        listName: z
            .string()
            .describe('Exact, case-sensitive title of the task list to add the task to. The list is created if no list with this title exists yet.'),
        title: z.string().describe('Title of the task to create.'),
        notes: z.string().optional().describe('Notes describing the task. Maximum length: 8192 characters.'),
        status: z.enum(['needsAction', 'completed']).optional().describe('Task status. Defaults to "needsAction" when omitted.'),
        due: z.string().optional().describe('Due date as an RFC 3339 timestamp. Only the date portion is stored by Google Tasks.'),
        parent: z.string().optional().describe('Identifier of the parent task, to create this task as a subtask.'),
        previous: z.string().optional().describe('Identifier of the previous sibling task, to control the task ordering among its siblings.')
    })
    .describe('Input for creating a task in the task list with a given name, creating that list if it does not exist yet.');

const OutputSchema = z
    .object({
        task: TaskSchema.describe('The newly created task.'),
        tasklist: TaskListSchema.describe('The task list the task was created in.'),
        tasklistCreated: z.boolean().describe('True if a new task list was created because no existing list matched listName.')
    })
    .describe('The created task, the resolved task list, and whether that list was newly created.');

/**
 * @tags: [read, write]
 * @tagReason: Reads the existing task lists to resolve the list name, then writes by creating the task list when it is missing and creating the task.
 * @pitfalls: List-name matching is a case-sensitive exact match on title, and because Google Tasks allows multiple lists with the same title the first match wins; list creation and task creation are separate calls, so if the task call fails a newly created empty list is left behind.
 */
const action = createAction({
    description: 'Create a task inside the task list matching a given name, creating that list first if it does not exist.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/tasks'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let tasklist: z.infer<typeof TaskListSchema> | undefined;
        let pageToken: string | undefined;

        do {
            const response = await nango.get({
                // https://developers.google.com/tasks/reference/rest/v1/tasklists/list
                endpoint: '/tasks/v1/users/@me/lists',
                params: {
                    maxResults: 100,
                    ...(pageToken !== undefined && { pageToken })
                },
                retries: 3
            });

            const parsed = TaskListsResponseSchema.parse(response.data);
            const match = parsed.items?.find((item) => item.title === input.listName);

            if (match) {
                tasklist = match;
                break;
            }

            pageToken = parsed.nextPageToken;
        } while (pageToken);

        let tasklistCreated = false;

        if (!tasklist) {
            const createListResponse = await nango.post({
                // https://developers.google.com/tasks/reference/rest/v1/tasklists/insert
                endpoint: '/tasks/v1/users/@me/lists',
                data: {
                    title: input.listName
                },
                // Creating a task list is not idempotent: a retry could create a duplicate list.
                // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
                retries: 0
            });

            tasklist = TaskListSchema.parse(createListResponse.data);
            tasklistCreated = true;
        }

        const createTaskResponse = await nango.post({
            // https://developers.google.com/tasks/reference/rest/v1/tasks/insert
            endpoint: `/tasks/v1/lists/${encodeURIComponent(tasklist.id)}/tasks`,
            params: {
                ...(input.parent !== undefined && { parent: input.parent }),
                ...(input.previous !== undefined && { previous: input.previous })
            },
            data: {
                title: input.title,
                ...(input.notes !== undefined && { notes: input.notes }),
                ...(input.status !== undefined && { status: input.status }),
                ...(input.due !== undefined && { due: input.due })
            },
            // Creating a task is not idempotent: a retry could create a duplicate task.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const task = TaskSchema.parse(createTaskResponse.data);

        return {
            task,
            tasklist,
            tasklistCreated
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
