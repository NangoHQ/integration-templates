import { createAction } from "nango";
import { toTask } from '../mappers/to-task.js';

import type { AsanaTask, NangoActionError } from "../models.js";
import { Task, AsanaUpdateTask } from "../models.js";

const action = createAction({
    description: "Update a task and be able to assign the task to a specific user",
    version: "1.0.0",

    endpoint: {
        method: "PATCH",
        path: "/tasks",
        group: "Tasks"
    },

    input: AsanaUpdateTask,
    output: Task,

    exec: async (nango, input): Promise<Task> => {
        if (!input.id) {
            throw new nango.ActionError<NangoActionError>({
                type: 'validation_error',
                message: 'You must specify a task id (gid) to update.'
            });
        }

        const normalizedInput = normalizeDates(input);

        const response = await nango.put<{ data: AsanaTask }>({
            endpoint: `/api/1.0/tasks/${input.id}`,
            data: {
                data: normalizedInput
            },
            retries: 3
        });

        const { data } = response;

        return toTask(data.data);
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;

function normalizeDates(input: AsanaUpdateTask): AsanaUpdateTask {
    return {
        ...input,
        due_on: input.due_on ? new Date(input.due_on).toISOString() : undefined,
        due_at: input.due_at ? new Date(input.due_at).toISOString() : undefined
    };
}
