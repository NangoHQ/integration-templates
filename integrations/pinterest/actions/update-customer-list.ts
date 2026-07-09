import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    ad_account_id: z.string().describe('Ad account ID. Example: "549770573673"'),
    customer_list_id: z.string().describe('Customer list ID. Example: "4189730"'),
    operation_type: z.enum(['ADD', 'REMOVE']).describe('Update operation type. Use ADD to append records, REMOVE to remove them.'),
    records: z
        .string()
        .describe(
            'Comma-separated list of records. Can be emails, MAIDs, or IDFAs. Emails must be lowercase and can be plain text or hashed using SHA1, SHA256, or MD5. Example: "email1@example.com,email2@example.com"'
        )
});

const CustomerListStatusSchema = z.enum(['PROCESSING', 'TOO_SMALL', 'READY', 'EXPIRED', 'DELETED', 'UPLOADING', 'UNKNOWN']);

const ProviderCustomerListSchema = z.object({
    ad_account_id: z.string().optional(),
    created_time: z.number().optional(),
    exceptions: z.record(z.string(), z.unknown()).optional(),
    id: z.string(),
    is_nca: z.boolean().optional(),
    name: z.string(),
    num_batches: z.number().optional(),
    num_removed_user_records: z.number().optional(),
    num_uploaded_user_records: z.number().optional(),
    status: CustomerListStatusSchema.optional(),
    type: z.string().optional(),
    updated_time: z.number().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    ad_account_id: z.string().optional(),
    created_time: z.number().optional(),
    exceptions: z.record(z.string(), z.unknown()).optional(),
    is_nca: z.boolean().optional(),
    num_batches: z.number().optional(),
    num_removed_user_records: z.number().optional(),
    num_uploaded_user_records: z.number().optional(),
    status: z.string().optional(),
    type: z.string().optional(),
    updated_time: z.number().optional()
});

const action = createAction({
    description: 'Add or remove records on an existing customer list.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ads:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.patch({
            // https://developers.pinterest.com/docs/api/v5/#operation/customer_lists/update
            endpoint: `/v5/ad_accounts/${encodeURIComponent(input.ad_account_id)}/customer_lists/${encodeURIComponent(input.customer_list_id)}`,
            data: {
                operation_type: input.operation_type,
                records: input.records
            },
            retries: 1
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Customer list not found or update failed.',
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
