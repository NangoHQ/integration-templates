import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    ad_account_id: z.string().describe('Ad account ID. Example: "549770573673"'),
    name: z.string().describe('Customer list name. Example: "My Customer List"'),
    records: z.string().describe('Comma-separated records (e.g. emails, MAIDs, or IDFAs). Emails must be lowercase. Example: "a@x.com,b@x.com"'),
    list_type: z.enum(['EMAIL', 'IDFA', 'MAID', 'LR_ID', 'DLX_ID', 'HASHED_PINNER_ID']).optional().describe('Type of customer list. Defaults to EMAIL.')
});

const ProviderCustomerListSchema = z.object({
    id: z.string(),
    name: z.string(),
    ad_account_id: z.string().optional(),
    created_time: z.number().optional(),
    updated_time: z.number().optional(),
    status: z.string().optional(),
    type: z.string().optional(),
    is_nca: z.boolean().optional(),
    num_batches: z.number().optional(),
    num_uploaded_user_records: z.number().optional(),
    num_removed_user_records: z.number().optional(),
    exceptions: z.unknown().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    ad_account_id: z.string().optional(),
    created_time: z.number().optional(),
    updated_time: z.number().optional(),
    status: z.string().optional(),
    type: z.string().optional(),
    is_nca: z.boolean().optional(),
    num_batches: z.number().optional(),
    num_uploaded_user_records: z.number().optional(),
    num_removed_user_records: z.number().optional()
});

const action = createAction({
    description: 'Create a customer (match audience) list.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ads:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.pinterest.com/docs/api/v5/#tag/Customer-Lists/operation/customer_lists/create
            endpoint: `/v5/ad_accounts/${encodeURIComponent(input.ad_account_id)}/customer_lists`,
            data: {
                name: input.name,
                records: input.records,
                ...(input.list_type !== undefined && { list_type: input.list_type })
            },
            retries: 1
        });

        const providerList = ProviderCustomerListSchema.parse(response.data);

        return {
            id: providerList.id,
            name: providerList.name,
            ...(providerList.ad_account_id !== undefined && { ad_account_id: providerList.ad_account_id }),
            ...(providerList.created_time !== undefined && { created_time: providerList.created_time }),
            ...(providerList.updated_time !== undefined && { updated_time: providerList.updated_time }),
            ...(providerList.status !== undefined && { status: providerList.status }),
            ...(providerList.type !== undefined && { type: providerList.type }),
            ...(providerList.is_nca !== undefined && { is_nca: providerList.is_nca }),
            ...(providerList.num_batches !== undefined && { num_batches: providerList.num_batches }),
            ...(providerList.num_uploaded_user_records !== undefined && { num_uploaded_user_records: providerList.num_uploaded_user_records }),
            ...(providerList.num_removed_user_records !== undefined && { num_removed_user_records: providerList.num_removed_user_records })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
