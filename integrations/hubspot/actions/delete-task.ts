import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    task_id: z.string().describe('HubSpot task record ID to delete. Example: "12345"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    task_id: z.string()
});

const action = createAction({
    description: 'Delete a HubSpot task by record ID',
    version: '1.0.0',

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
            endpoint: `/crm/v3/objects/tasks/${input.task_id}`,
            retries: 10
        });

        return {
            success: true,
            task_id: input.task_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
