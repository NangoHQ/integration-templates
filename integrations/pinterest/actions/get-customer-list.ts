import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    ad_account_id: z.string().describe('Ad account ID. Example: "549770573673"'),
    customer_list_id: z.string().describe('Customer list ID. Example: "4189730"')
});

const ProviderCustomerListSchema = z.object({
    ad_account_id: z.string().optional(),
    created_time: z.number().optional(),
    exceptions: z.unknown().optional(),
    id: z.string(),
    is_nca: z.boolean().optional(),
    name: z.string(),
    num_batches: z.number().optional(),
    num_removed_user_records: z.number().optional(),
    num_uploaded_user_records: z.number().optional(),
    status: z.string().optional(),
    type: z.string().optional(),
    updated_time: z.number().optional()
});

const OutputSchema = z.object({
    ad_account_id: z.string().optional(),
    created_time: z.number().optional(),
    exceptions: z.unknown().optional(),
    id: z.string(),
    is_nca: z.boolean().optional(),
    name: z.string(),
    num_batches: z.number().optional(),
    num_removed_user_records: z.number().optional(),
    num_uploaded_user_records: z.number().optional(),
    status: z.string().optional(),
    type: z.string().optional(),
    updated_time: z.number().optional()
});

const action = createAction({
    description: 'Retrieve a customer list',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ads:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.pinterest.com/docs/api/v5/#operation/customer_lists/get
            endpoint: `/v5/ad_accounts/${encodeURIComponent(input.ad_account_id)}/customer_lists/${encodeURIComponent(input.customer_list_id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Customer list not found',
                ad_account_id: input.ad_account_id,
                customer_list_id: input.customer_list_id
            });
        }

        const providerList = ProviderCustomerListSchema.parse(response.data);

        return {
            id: providerList.id,
            name: providerList.name,
            ...(providerList.ad_account_id !== undefined && { ad_account_id: providerList.ad_account_id }),
            ...(providerList.created_time !== undefined && { created_time: providerList.created_time }),
            ...(providerList.exceptions !== undefined && { exceptions: providerList.exceptions }),
            ...(providerList.is_nca !== undefined && { is_nca: providerList.is_nca }),
            ...(providerList.num_batches !== undefined && { num_batches: providerList.num_batches }),
            ...(providerList.num_removed_user_records !== undefined && { num_removed_user_records: providerList.num_removed_user_records }),
            ...(providerList.num_uploaded_user_records !== undefined && { num_uploaded_user_records: providerList.num_uploaded_user_records }),
            ...(providerList.status !== undefined && { status: providerList.status }),
            ...(providerList.type !== undefined && { type: providerList.type }),
            ...(providerList.updated_time !== undefined && { updated_time: providerList.updated_time })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
