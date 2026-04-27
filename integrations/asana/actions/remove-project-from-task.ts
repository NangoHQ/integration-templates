import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    task_gid: z.string().describe('The globally unique identifier for the task. Example: "123456789"'),
    project_gid: z.string().describe('The globally unique identifier for the project to remove the task from. Example: "987654321"')
});

const OutputSchema = z.object({});

const action = createAction({
    description: 'Remove a task from a project',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/remove-project-from-task',
        group: 'Tasks'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['tasks:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.asana.com/reference/removeprojectfortask
        const response = await nango.post({
            endpoint: `/api/1.0/tasks/${input.task_gid}/removeProject`,
            data: {
                data: {
                    project: input.project_gid
                }
            },
            retries: 3
        });

        if (response.status !== 200) {
            throw new nango.ActionError({
                type: 'api_error',
                message: `Failed to remove project from task: received status ${response.status}`
            });
        }

        return {};
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
