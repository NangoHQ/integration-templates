import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    record_id: z.string().describe('The ID of the call record to delete. Example: "1234567890123"')
});

const ProviderDeleteResponseSchema = z.object({
    data: z.array(
        z.object({
            code: z.string(),
            details: z.object({}).passthrough().optional(),
            message: z.string().optional(),
            status: z.string()
        })
    )
});

const OutputSchema = z.object({
    success: z.boolean(),
    message: z.string().optional(),
    record_id: z.string()
});

const action = createAction({
    description: 'Delete or archive a call in Zoho CRM.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-call',
        group: 'Calls'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoCRM.modules.calls.ALL', 'ZohoCRM.modules.calls.DELETE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.zoho.com/crm/developer/docs/api/v2/Calls/delete-calls.html
        const response = await nango.delete({
            endpoint: `/crm/v2/Calls/${input.record_id}`,
            retries: 3
        });

        const parsed = ProviderDeleteResponseSchema.parse(response.data);

        const firstResult = parsed.data[0];
        if (!firstResult) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Empty response from Zoho CRM API'
            });
        }

        if (firstResult.status === 'success') {
            return {
                success: true,
                record_id: input.record_id,
                message: firstResult.message || 'Call deleted successfully'
            };
        } else {
            throw new nango.ActionError({
                type: 'delete_failed',
                message: firstResult.message || 'Failed to delete call',
                code: firstResult.code,
                record_id: input.record_id
            });
        }
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
