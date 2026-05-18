import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    task_id: z.string().describe('The unique ID of the task to delete. Example: "6805054f-0fef-478d-99a3-b864bd09ee2a"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    task_id: z.string()
});

const action = createAction({
    description: 'Delete or archive a task in Attio.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-task',
        group: 'Tasks'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['task:read-write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.attio.com/rest-api/tasks#delete-tasks-task-id
        await nango.delete({
            endpoint: `/v2/tasks/${input.task_id}`,
            retries: 3
        });

        return {
            success: true,
            task_id: input.task_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
