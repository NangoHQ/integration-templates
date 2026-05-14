import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    record_id: z.string().describe('The unique ID of the deal record to delete. Example: "415155000000074323"')
});

const ProviderDeleteResponseSchema = z.object({
    data: z.array(
        z.object({
            code: z.string(),
            details: z.any().optional(),
            message: z.string(),
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
    description: 'Delete or archive a deal in Zoho CRM',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-deal',
        group: 'Deals'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoCRM.modules.ALL', 'ZohoCRM.modules.deals.ALL'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.zoho.com/crm/developer/docs/api/v2/Deals/delete-deals.html
        const response = await nango.delete({
            endpoint: `/crm/v2/Deals/${input.record_id}`,
            retries: 3
        });

        if (response.status !== 200 && response.status !== 202) {
            throw new nango.ActionError({
                type: 'delete_failed',
                message: `Failed to delete deal: ${response.statusText || 'Unknown error'}`,
                record_id: input.record_id,
                status: response.status
            });
        }

        const providerResponse = ProviderDeleteResponseSchema.parse(response.data);
        const result = providerResponse.data[0];

        if (!result) {
            throw new nango.ActionError({
                type: 'delete_failed',
                message: 'No response data from delete operation',
                record_id: input.record_id
            });
        }

        if (result.status !== 'success') {
            throw new nango.ActionError({
                type: 'delete_failed',
                message: result.message || 'Delete operation failed',
                record_id: input.record_id,
                code: result.code
            });
        }

        return {
            success: true,
            message: result.message,
            record_id: input.record_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
