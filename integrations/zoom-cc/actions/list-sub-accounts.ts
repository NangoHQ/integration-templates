import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    page_size: z.number().optional().describe('The number of records returned within a single API call. Max: 300.'),
    next_page_token: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const ProviderAccountSchema = z
    .object({
        id: z.string().optional(),
        account_name: z.string().optional(),
        account_type: z.string().optional(),
        seats: z.number().optional(),
        subscription_start_time: z.string().optional(),
        subscription_end_time: z.string().optional(),
        created_at: z.string().optional(),
        owner_email: z.string().optional(),
        account_number: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    page_size: z.number().optional(),
    total_records: z.number().optional(),
    next_page_token: z.string().optional(),
    accounts: z.array(ProviderAccountSchema).optional()
});

const action = createAction({
    description: 'List sub-accounts managed by this master account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['account:read:sub_account:admin', 'account:read:sub_account:master'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.zoom.us/docs/api/rest/reference/zoom-api/methods/#operation/accounts
            endpoint: '/v2/accounts',
            params: {
                ...(input.page_size !== undefined && { page_size: String(input.page_size) }),
                ...(input.next_page_token !== undefined && { next_page_token: input.next_page_token })
            },
            retries: 3
        });

        const providerData = z
            .object({
                page_size: z.number().optional(),
                total_records: z.number().optional(),
                next_page_token: z.string().optional(),
                accounts: z.array(z.unknown()).optional()
            })
            .parse(response.data);

        const accounts = (providerData.accounts || []).map((account) => {
            return ProviderAccountSchema.parse(account);
        });

        return {
            ...(providerData.page_size !== undefined && { page_size: providerData.page_size }),
            ...(providerData.total_records !== undefined && { total_records: providerData.total_records }),
            ...(providerData.next_page_token !== undefined && { next_page_token: providerData.next_page_token }),
            accounts
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
