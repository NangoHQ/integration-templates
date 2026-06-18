import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    record_id: z.string().describe('The unique ID of the account record to delete. Example: "123456789012345"')
});

const ProviderDeleteResponseSchema = z.object({
    data: z.array(
        z.object({
            code: z.string(),
            details: z.record(z.string(), z.unknown()).optional(),
            message: z.string().optional(),
            status: z.string()
        })
    )
});

const OutputSchema = z.object({
    record_id: z.string(),
    success: z.boolean(),
    message: z.string().optional()
});

const action = createAction({
    description: 'Delete or archive an account in Zoho CRM.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoCRM.modules.accounts.ALL', 'ZohoCRM.modules.accounts.WRITE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.zoho.com/crm/developer/docs/api/v2/Accounts/delete-account.html
        const response = await nango.delete({
            endpoint: `/crm/v2/Accounts/${input.record_id}`,
            retries: 3
        });

        const parsedResponse = ProviderDeleteResponseSchema.parse(response.data);

        if (!parsedResponse.data || parsedResponse.data.length === 0) {
            throw new nango.ActionError({
                type: 'delete_failed',
                message: 'No response data received from Zoho CRM',
                record_id: input.record_id
            });
        }

        const result = parsedResponse.data[0];

        if (!result) {
            throw new nango.ActionError({
                type: 'delete_failed',
                message: 'Invalid response from Zoho CRM',
                record_id: input.record_id
            });
        }

        if (result.status !== 'success') {
            throw new nango.ActionError({
                type: 'delete_failed',
                message: result.message || 'Failed to delete account',
                code: result.code,
                record_id: input.record_id
            });
        }

        return {
            record_id: input.record_id,
            success: true,
            message: result.message
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
