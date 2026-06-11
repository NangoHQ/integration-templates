import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    taskId: z.string().describe('The unique identifier of the task to delete. Example: "1781108295426155000"')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Delete a personal task in Zoho Mail',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-task',
        group: 'Tasks'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoMail.tasks.ALL'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const encodedTaskId = encodeURIComponent(input.taskId);

        // https://www.zoho.com/mail/help/api/
        const response = await nango.delete({
            endpoint: `/api/tasks/me/${encodedTaskId}`,
            retries: 1
        });

        if (response.status !== 200 && response.status !== 204) {
            throw new nango.ActionError({
                type: 'delete_failed',
                message: `Failed to delete task. Received status ${response.status}.`,
                taskId: input.taskId
            });
        }

        return { success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
