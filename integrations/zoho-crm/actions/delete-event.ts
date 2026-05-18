import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    record_id: z.string().describe('The unique ID of the event record to delete. Example: "410405000002264040"')
});

const DeleteResponseSchema = z.object({
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
    id: z.string().describe('The ID of the deleted event'),
    success: z.boolean().describe('Whether the deletion was successful'),
    message: z.string().optional().describe('Status message from the API'),
    deleted_from_recycle_bin: z.boolean().optional().describe('Whether the record was permanently deleted from recycle bin')
});

const action = createAction({
    description: 'Delete or archive an event in Zoho CRM',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-event',
        group: 'Events'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoCRM.modules.Events.DELETE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.zoho.com/crm/developer/docs/api/v2/delete-records.html
        const response = await nango.delete({
            endpoint: `/crm/v2/Events/${input.record_id}`,
            retries: 1
        });

        // Zoho returns 202 (Accepted) for successful deletion
        if (response.status !== 200 && response.status !== 202) {
            throw new nango.ActionError({
                type: 'delete_failed',
                message: `Failed to delete event. Status: ${response.status}`,
                record_id: input.record_id
            });
        }

        // 202 response may not have response body, handle both cases
        if (!response.data) {
            return {
                id: input.record_id,
                success: true,
                message: 'Event deletion accepted'
            };
        }

        const result = DeleteResponseSchema.safeParse(response.data);

        if (!result.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from Zoho CRM API',
                record_id: input.record_id
            });
        }

        const recordResult = result.data.data[0];

        if (!recordResult) {
            throw new nango.ActionError({
                type: 'no_response',
                message: 'No response data received from Zoho CRM API',
                record_id: input.record_id
            });
        }

        if (recordResult.status !== 'success') {
            throw new nango.ActionError({
                type: 'delete_failed',
                message: recordResult.message,
                record_id: input.record_id,
                code: recordResult.code
            });
        }

        return {
            id: recordResult.details.id,
            success: recordResult.status === 'success',
            message: recordResult.message
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
