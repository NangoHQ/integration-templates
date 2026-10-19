import { z } from 'zod';
import { createAction } from 'nango';
import { ProviderTaskSchema, TaskSchema, toTask, type ProviderTask } from '../helpers/schemas.js';

const InputSchema = z
    .object({
        tasklist: z
            .string()
            .describe(
                'ID of the task list that contains the task. Use "@default" for the authenticated user\'s default list. Example: "MDQwOTY3MjU2NTE0MjcwODI3ODI6MDow"'
            ),
        task: z.string().describe('ID of the task to mark as completed. Example: "LWlneng5SFhnU2IyN2h4Qg"')
    })
    .describe('Identifies the task to complete within a task list.');

const ProviderTasksPageSchema = z.object({
    items: z.array(ProviderTaskSchema).nullish(),
    nextPageToken: z.string().nullish()
});

const OutputSchema = z
    .object({
        task: TaskSchema.describe('The completed task as read back from the provider after the update.'),
        cascadedSubtasks: z
            .array(TaskSchema)
            .describe('Direct subtasks that are completed after the update, i.e. auto-completed as a side effect of completing the task.')
    })
    .describe('The verified completed task together with any subtasks that were auto-completed by the cascade.');

/**
 * @tags: [read, write]
 * @tagReason: Reads the task and its task list, then mutates the task's status to completed.
 * @pitfalls: Completing a parent task automatically completes its direct subtasks, and any subtask that is already completed when the action reads back is reported in cascadedSubtasks, so subtasks completed earlier may also appear; the read-back pages through the whole list (100 tasks per request), so very large lists cost several requests; completion is reversible by setting the status back to "needsAction".
 */
const action = createAction({
    description: 'Complete a task, verify its final state, and report any subtasks that were auto-completed as a side effect.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/tasks'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const encodedTasklist = encodeURIComponent(input.tasklist);
        const encodedTask = encodeURIComponent(input.task);

        // https://developers.google.com/tasks/reference/rest/v1/tasks/patch
        // PATCH status=completed is idempotent (re-applying it yields the same final state), so retries are safe.
        await nango.patch({
            endpoint: `/tasks/v1/lists/${encodedTasklist}/tasks/${encodedTask}`,
            data: {
                status: 'completed'
            },
            retries: 3
        });

        // https://developers.google.com/tasks/reference/rest/v1/tasks/get
        const taskResponse = await nango.get({
            endpoint: `/tasks/v1/lists/${encodedTasklist}/tasks/${encodedTask}`,
            retries: 3
        });

        const task = ProviderTaskSchema.parse(taskResponse.data);

        if (task.status !== 'completed') {
            throw new nango.ActionError({
                type: 'not_completed',
                message: 'The task did not report a completed status after the update.',
                task_id: input.task,
                status: task.status ?? null
            });
        }

        // Page through the whole list: the default page size is 20, so a single request would undercount subtasks.
        const tasks: ProviderTask[] = [];
        let pageToken: string | undefined;
        do {
            // https://developers.google.com/tasks/reference/rest/v1/tasks/list
            const listResponse = await nango.get({
                endpoint: `/tasks/v1/lists/${encodedTasklist}/tasks`,
                params: {
                    maxResults: 100,
                    showCompleted: 'true',
                    showHidden: 'true',
                    ...(pageToken !== undefined && { pageToken })
                },
                retries: 3
            });

            const page = ProviderTasksPageSchema.parse(listResponse.data);
            tasks.push(...(page.items ?? []));
            pageToken = page.nextPageToken ?? undefined;
        } while (pageToken !== undefined);

        const cascadedSubtasks = tasks.filter((item) => item.parent === task.id && item.status === 'completed' && item.deleted !== true).map(toTask);

        return {
            task: toTask(task),
            cascadedSubtasks
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
