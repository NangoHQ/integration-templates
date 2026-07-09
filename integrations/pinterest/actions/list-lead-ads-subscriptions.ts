import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    ad_account_id: z.string().describe('Ad Account ID. Example: "549770573673"'),
    cursor: z.string().optional().describe('Pagination cursor (bookmark) from the previous response. Omit for the first page.'),
    page_size: z.number().optional().describe('Number of results per page. Max 250.')
});

const ProviderSubscriptionSchema = z.object({
    ad_account_id: z.string().optional(),
    api_version: z.string().optional(),
    created_time: z.number().optional(),
    cryptographic_algorithm: z.string().nullable().optional(),
    cryptographic_key: z.string().nullable().optional(),
    id: z.string().optional(),
    lead_form_id: z.string().nullable().optional(),
    user_account_id: z.string().optional(),
    webhook_url: z.string().optional()
});

const ProviderResponseSchema = z.object({
    bookmark: z.string().nullable().optional(),
    items: z.array(ProviderSubscriptionSchema)
});

const SubscriptionOutputSchema = z.object({
    ad_account_id: z.string().optional(),
    api_version: z.string().optional(),
    created_time: z.number().optional(),
    cryptographic_algorithm: z.string().optional(),
    cryptographic_key: z.string().optional(),
    id: z.string().optional(),
    lead_form_id: z.string().optional(),
    user_account_id: z.string().optional(),
    webhook_url: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(SubscriptionOutputSchema),
    bookmark: z.string().optional()
});

const action = createAction({
    description: 'List webhook subscriptions for new lead submissions.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ads:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.pinterest.com/docs/api/v5/ad_accounts_subscriptions-get_list/
            endpoint: `/v5/ad_accounts/${encodeURIComponent(input.ad_account_id)}/leads/subscriptions`,
            params: {
                ...(input.cursor !== undefined && { bookmark: input.cursor }),
                ...(input.page_size !== undefined && { page_size: String(input.page_size) })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            items: providerResponse.items.map((item) => ({
                ...(item.ad_account_id !== undefined && { ad_account_id: item.ad_account_id }),
                ...(item.api_version !== undefined && { api_version: item.api_version }),
                ...(item.created_time !== undefined && { created_time: item.created_time }),
                ...(item.cryptographic_algorithm !== undefined &&
                    item.cryptographic_algorithm !== null && { cryptographic_algorithm: item.cryptographic_algorithm }),
                ...(item.cryptographic_key !== undefined && item.cryptographic_key !== null && { cryptographic_key: item.cryptographic_key }),
                ...(item.id !== undefined && { id: item.id }),
                ...(item.lead_form_id !== undefined && item.lead_form_id !== null && { lead_form_id: item.lead_form_id }),
                ...(item.user_account_id !== undefined && { user_account_id: item.user_account_id }),
                ...(item.webhook_url !== undefined && { webhook_url: item.webhook_url })
            })),
            ...(providerResponse.bookmark !== undefined && providerResponse.bookmark !== null && { bookmark: providerResponse.bookmark })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
