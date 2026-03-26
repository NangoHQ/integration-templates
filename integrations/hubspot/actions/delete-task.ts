import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    taskId: z.string().describe('HubSpot task record ID to delete. Example: "12345"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    taskId: z.string()
});

const action = createAction({
    description: 'Delete a HubSpot task by record ID',
    version: '3.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/delete-task',
        group: 'Tasks'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['crm.objects.contacts.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.hubspot.com/docs/api-reference/crm/tasks
        await nango.delete({
            endpoint: `/crm/v3/objects/tasks/${input.taskId}`,
            retries: 3
        });

        return {
            success: true,
            taskId: input.taskId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
