import { createAction } from 'nango';
import { toTask } from '../mappers/to-task.js';

import type { NangoActionError, AsanaTask } from '../models.js';
import { Task, CreateAsanaTask } from '../models.js';

const action = createAction({
    description:
        'Create a task using Asana specific fields and return a unified model task. See https://developers.asana.com/reference/createtask for Asana specific fields',
    version: '2.0.0',

    endpoint: {
        method: 'POST',
        path: '/tasks',
        group: 'Tasks'
    },

    input: CreateAsanaTask,
    output: Task,

    exec: async (nango, input): Promise<Task> => {
        if (!input.parent && !input.projects) {
            throw new nango.ActionError<NangoActionError>({
                type: 'validation_error',
                message:
                    'You must specify one of workspace, parent or projects. For more information on API status codes and how to handle them, read the docs on errors: https://developers.asana.com/docs/errors'
            });
        }

        const response = await nango.post<{ data: AsanaTask }>({
            endpoint: '/api/1.0/tasks',
            data: {
                data: input
            },
            retries: 3
        });

        const { data } = response;

        return toTask(data.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
