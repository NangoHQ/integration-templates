import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        tasklist: z
            .string()
            .optional()
            .describe(
                'ID of the task list that contains the task. Defaults to "@default", the authenticated user\'s default list. Example: "MDQwOTY3MjU2NTE0MjcwODI3ODI6MDow"'
            ),
        task: z.string().describe('ID of the task to mark as completed. Example: "LWlneng5SFhnU2IyN2h4Qg"')
    })
    .describe('Identifies the task to complete within a task list.');

const ProviderTaskSchema = z.object({
    id: z.string(),
    title: z.string().nullish(),
    status: z.string().nullish(),
    completed: z.string().nullish(),
    parent: z.string().nullish(),
    updated: z.string().nullish(),
    deleted: z.boolean().nullish(),
    hidden: z.boolean().nullish()
});

const ProviderTasksListSchema = z.object({
    items: z.array(ProviderTaskSchema).nullish()
});

const TaskSchema = z.object({
    id: z.string().describe('Unique identifier of the task.'),
    title: z.string().optional().describe('Title of the task.'),
    status: z.string().describe('Current status of the task. This is "completed" when the action succeeds.'),
    completed: z.string().optional().describe('RFC 3339 completion timestamp set by the provider once the task is completed.'),
    parent: z.string().optional().describe('ID of the parent task when this task is a subtask.'),
    updated: z.string().optional().describe('RFC 3339 timestamp of the last modification to the task.'),
    deleted: z.boolean().optional().describe('Whether the task is a deleted tombstone.'),
    hidden: z.boolean().optional().describe('Whether the task is hidden from the default task view.')
});

const CascadedSubtaskSchema = z.object({
    id: z.string().describe('Unique identifier of the subtask that was auto-completed.'),
    title: z.string().optional().describe('Title of the subtask.'),
    status: z.string().describe('Subtask status; "completed" confirms the parent completion cascaded to it.'),
    completed: z.string().optional().describe('RFC 3339 completion timestamp set by the provider on the subtask.'),
    parent: z.string().optional().describe('ID of the parent task (the task that was completed).')
});

const OutputSchema = z
    .object({
        task: TaskSchema.describe('The completed task as read back from the provider after the update.'),
        cascadedSubtasks: z.array(CascadedSubtaskSchema).describe('Direct subtasks that were auto-completed as a side effect of completing the task.')
    })
    .describe('The verified completed task together with any subtasks that were auto-completed by the cascade.');

/**
 * @tags: [read, write]
 * @tagReason: Reads the task and its task list, then mutates the task's status to completed.
 * @pitfalls: Completing a parent task automatically completes its direct subtasks, and any subtask that is already completed when the action reads back is reported in cascadedSubtasks, so subtasks completed earlier may also appear; completion is reversible by setting the status back to "needsAction".
 */
const action = createAction({
    description: 'Complete a task, verify its final state, and report any subtasks that were auto-completed as a side effect.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/tasks'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const rawTasklist = input.tasklist ?? '@default';
        const encodedTasklist = rawTasklist === '@default' ? '@default' : encodeURIComponent(rawTasklist);
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

        // https://developers.google.com/tasks/reference/rest/v1/tasks/list
        const listResponse = await nango.get({
            endpoint: `/tasks/v1/lists/${encodedTasklist}/tasks`,
            params: {
                showCompleted: 'true',
                showHidden: 'true'
            },
            retries: 3
        });

        const tasksList = ProviderTasksListSchema.parse(listResponse.data);

        const cascadedSubtasks = (tasksList.items ?? [])
            .filter((item) => item.parent === task.id && item.status === 'completed')
            .map((item) => ({
                id: item.id,
                ...(item.title != null && { title: item.title }),
                status: item.status ?? 'completed',
                ...(item.completed != null && { completed: item.completed }),
                ...(item.parent != null && { parent: item.parent })
            }));

        return {
            task: {
                id: task.id,
                ...(task.title != null && { title: task.title }),
                status: task.status,
                ...(task.completed != null && { completed: task.completed }),
                ...(task.parent != null && { parent: task.parent }),
                ...(task.updated != null && { updated: task.updated }),
                ...(task.deleted != null && { deleted: task.deleted }),
                ...(task.hidden != null && { hidden: task.hidden })
            },
            cascadedSubtasks
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
