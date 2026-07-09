import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    ad_account_id: z.string().describe('Ad Account ID. Example: "549770573673"'),
    webhook_url: z.string().describe('Standard HTTPS webhook URL to receive lead data.'),
    lead_form_id: z.string().optional().describe('Lead form ID to filter leads by. Omit to subscribe to all leads in the ad account.')
});

const ProviderResponseSchema = z.object({
    id: z.string(),
    ad_account_id: z.string(),
    user_account_id: z.string(),
    webhook_url: z.string(),
    lead_form_id: z.string().nullable().optional(),
    api_version: z.string().optional(),
    created_time: z.number().optional(),
    cryptographic_algorithm: z.string().nullable().optional(),
    cryptographic_key: z.string().nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    ad_account_id: z.string(),
    user_account_id: z.string(),
    webhook_url: z.string(),
    lead_form_id: z.string().optional(),
    api_version: z.string().optional(),
    created_time: z.number().optional(),
    cryptographic_algorithm: z.string().optional(),
    cryptographic_key: z.string().optional()
});

const action = createAction({
    description: 'Create a webhook subscription for new lead submissions.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ads:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.pinterest.com/docs/api/v5/#operation/ad_accounts_subscriptions/post
            endpoint: `/v5/ad_accounts/${encodeURIComponent(input.ad_account_id)}/leads/subscriptions`,
            data: {
                webhook_url: input.webhook_url,
                ...(input.lead_form_id !== undefined && { lead_form_id: input.lead_form_id })
            },
            retries: 3
        });

        const providerData = ProviderResponseSchema.parse(response.data);

        return {
            id: providerData.id,
            ad_account_id: providerData.ad_account_id,
            user_account_id: providerData.user_account_id,
            webhook_url: providerData.webhook_url,
            ...(providerData.lead_form_id != null && { lead_form_id: providerData.lead_form_id }),
            ...(providerData.api_version != null && { api_version: providerData.api_version }),
            ...(providerData.created_time != null && { created_time: providerData.created_time }),
            ...(providerData.cryptographic_algorithm != null && { cryptographic_algorithm: providerData.cryptographic_algorithm }),
            ...(providerData.cryptographic_key != null && { cryptographic_key: providerData.cryptographic_key })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
