import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    task_id: z.string().describe('The ID of the task to delete. Example: "410405000002264040"')
});

const ProviderResponseSchema = z.object({
    data: z.array(
        z.object({
            code: z.string(),
            details: z.object({
                id: z.string()
            }),
            message: z.string(),
            status: z.string()
        })
    )
});

const OutputSchema = z.object({
    success: z.boolean(),
    task_id: z.string(),
    message: z.string()
});

const action = createAction({
    description: 'Delete or archive a task in Zoho CRM',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoCRM.modules.tasks.DELETE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.zoho.com/crm/developer/docs/api/v2/delete-records.html
        const response = await nango.delete({
            endpoint: `/crm/v2/Tasks/${input.task_id}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'delete_failed',
                message: 'Delete request failed with no response data',
                task_id: input.task_id
            });
        }

        const parsedResponse = ProviderResponseSchema.parse(response.data);
        const result = parsedResponse.data[0];

        if (!result) {
            throw new nango.ActionError({
                type: 'delete_failed',
                message: 'No deletion confirmation received',
                task_id: input.task_id
            });
        }

        if (result.code !== 'SUCCESS' || result.status !== 'success') {
            throw new nango.ActionError({
                type: 'delete_failed',
                message: `Delete failed: ${result.message}`,
                task_id: input.task_id,
                code: result.code
            });
        }

        return {
            success: true,
            task_id: result.details.id,
            message: result.message
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
