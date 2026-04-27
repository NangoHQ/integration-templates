import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    task_gid: z.string().describe('The globally unique identifier for the task to delete. Example: "1209876543210987"')
});

const OutputSchema = z.object({
    task_gid: z.string().describe('The globally unique identifier of the deleted task.'),
    success: z.boolean().describe('Whether the deletion was successful.')
});

const action = createAction({
    description: 'Delete a task by gid.',
    version: '3.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-task',
        group: 'Tasks'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['tasks:delete'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://developers.asana.com/reference/delete-task
            endpoint: `/api/1.0/tasks/${input.task_gid}`,
            retries: 1
        });

        const providerResponse = z
            .object({
                data: z.unknown().optional()
            })
            .parse(response.data);

        if (providerResponse.data === undefined) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Asana did not return a data field.'
            });
        }

        return {
            task_gid: input.task_gid,
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
