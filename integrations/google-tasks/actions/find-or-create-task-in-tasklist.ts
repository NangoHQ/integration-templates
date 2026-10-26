import { z } from 'zod';
import { createAction } from 'nango';
import { ProviderTaskListSchema, ProviderTaskSchema, TaskListSchema, TaskSchema, toTask, toTaskList } from '../helpers/schemas.js';

const ProviderTaskListsPageSchema = z.object({
    items: z.array(ProviderTaskListSchema).nullish(),
    nextPageToken: z.string().nullish()
});

const ProviderTasksPageSchema = z.object({
    items: z.array(ProviderTaskSchema).nullish(),
    nextPageToken: z.string().nullish()
});

const InputSchema = z
    .object({
        listName: z
            .string()
            .describe('Exact, case-sensitive title of the task list to use. The list is created if no list with this title exists yet. Example: "Groceries"'),
        title: z
            .string()
            .describe(
                'Exact, case-sensitive title of the task to find. A new task with this title is created only if the list has no matching task. Example: "Buy milk"'
            ),
        notes: z.string().optional().describe('Notes for the task. Only used when a new task is created. Maximum length: 8192 characters.'),
        status: z
            .enum(['needsAction', 'completed'])
            .optional()
            .describe('Task status. Only used when a new task is created; defaults to "needsAction" when omitted.'),
        due: z.string().optional().describe('Due date as an RFC 3339 timestamp. Only used when a new task is created; only the date portion is stored.'),
        parent: z
            .string()
            .optional()
            .describe(
                'Identifier of the parent task. When set, only subtasks of this parent match, and a newly created task is created as its subtask. When omitted, a task with the title matches anywhere in the list.'
            ),
        previous: z.string().optional().describe('Identifier of the previous sibling task. Only used to position a newly created task.')
    })
    .describe('Input for finding a task by title in the task list with a given name, creating the list and/or the task when missing.');

const OutputSchema = z
    .object({
        task: TaskSchema.describe('The existing task that matched, or the newly created task.'),
        tasklist: TaskListSchema.describe('The task list that holds the task.'),
        tasklistCreated: z.boolean().describe('True if a new task list was created because no existing list matched listName.'),
        taskCreated: z.boolean().describe('True if a new task was created; false if an existing task with the same title was found and returned unchanged.')
    })
    .describe('The found or created task, the resolved task list, and whether each one was newly created.');

/**
 * @tags: [read, write]
 * @tagReason: Reads the task lists and the tasks of the matching list, then creates the task list and/or the task only when no match exists.
 * @pitfalls: Matching is a case-sensitive exact match on title; Google Tasks allows duplicate titles, so the first match wins. Completed and hidden tasks match too (deleted tasks do not), and a found task is returned as-is: notes, status, and due are not applied to it. Google Tasks has no idempotency key, so two concurrent calls can both miss and create duplicate lists or tasks. List creation and task creation are separate calls, so if the task call fails a newly created empty list is left behind.
 */
const action = createAction({
    description: 'Find a task by title in the task list with a given name, creating the list and/or the task only when they do not exist yet.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/tasks'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let tasklist: z.infer<typeof ProviderTaskListSchema> | undefined;
        let listPageToken: string | undefined;

        do {
            const response = await nango.get({
                // https://developers.google.com/tasks/reference/rest/v1/tasklists/list
                endpoint: '/tasks/v1/users/@me/lists',
                params: {
                    maxResults: 100,
                    ...(listPageToken !== undefined && { pageToken: listPageToken })
                },
                retries: 3
            });

            const page = ProviderTaskListsPageSchema.parse(response.data);
            tasklist = page.items?.find((item) => item.title === input.listName);
            listPageToken = page.nextPageToken ?? undefined;
        } while (!tasklist && listPageToken !== undefined);

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

            tasklist = ProviderTaskListSchema.parse(createListResponse.data);
            tasklistCreated = true;
        }

        const encodedTasklist = encodeURIComponent(tasklist.id);

        // A freshly created list is empty, so only search an existing list.
        let existingTask: z.infer<typeof ProviderTaskSchema> | undefined;
        if (!tasklistCreated) {
            let taskPageToken: string | undefined;
            do {
                const response = await nango.get({
                    // https://developers.google.com/tasks/reference/rest/v1/tasks/list
                    endpoint: `/tasks/v1/lists/${encodedTasklist}/tasks`,
                    params: {
                        maxResults: 100,
                        showCompleted: 'true',
                        showHidden: 'true',
                        ...(taskPageToken !== undefined && { pageToken: taskPageToken })
                    },
                    retries: 3
                });

                const page = ProviderTasksPageSchema.parse(response.data);
                existingTask = page.items?.find(
                    (item) => item.title === input.title && item.deleted !== true && (input.parent === undefined || item.parent === input.parent)
                );
                taskPageToken = page.nextPageToken ?? undefined;
            } while (!existingTask && taskPageToken !== undefined);
        }

        if (existingTask) {
            return {
                task: toTask(existingTask),
                tasklist: toTaskList(tasklist),
                tasklistCreated,
                taskCreated: false
            };
        }

        const createTaskResponse = await nango.post({
            // https://developers.google.com/tasks/reference/rest/v1/tasks/insert
            endpoint: `/tasks/v1/lists/${encodedTasklist}/tasks`,
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

        return {
            task: toTask(ProviderTaskSchema.parse(createTaskResponse.data)),
            tasklist: toTaskList(tasklist),
            tasklistCreated,
            taskCreated: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
