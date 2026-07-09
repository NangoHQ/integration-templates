import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    ad_account_id: z.string().describe('Unique identifier of an ad account. Example: "549770573673"'),
    subscription_id: z.string().describe('Subscription ID. Example: "123456789"')
});

const ProviderLeadSubscriptionSchema = z.object({
    ad_account_id: z.string().optional(),
    api_version: z.string().optional(),
    created_time: z.number().int().optional(),
    cryptographic_algorithm: z.string().nullable().optional(),
    cryptographic_key: z.string().nullable().optional(),
    id: z.string(),
    lead_form_id: z.string().nullable().optional(),
    user_account_id: z.string().optional(),
    webhook_url: z.string().optional()
});

const OutputSchema = z.object({
    ad_account_id: z.string().optional(),
    api_version: z.string().optional(),
    created_time: z.number().int().optional(),
    cryptographic_algorithm: z.string().optional(),
    cryptographic_key: z.string().optional(),
    id: z.string(),
    lead_form_id: z.string().optional(),
    user_account_id: z.string().optional(),
    webhook_url: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a lead ads webhook subscription.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ads:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.pinterest.com/docs/api/v5/
            endpoint: `/v5/ad_accounts/${encodeURIComponent(input.ad_account_id)}/leads/subscriptions/${encodeURIComponent(input.subscription_id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Lead ads subscription not found',
                ad_account_id: input.ad_account_id,
                subscription_id: input.subscription_id
            });
        }

        const providerSubscription = ProviderLeadSubscriptionSchema.parse(response.data);

        return {
            ...(providerSubscription.ad_account_id !== undefined && { ad_account_id: providerSubscription.ad_account_id }),
            ...(providerSubscription.api_version !== undefined && { api_version: providerSubscription.api_version }),
            ...(providerSubscription.created_time !== undefined && { created_time: providerSubscription.created_time }),
            ...(providerSubscription.cryptographic_algorithm != null && { cryptographic_algorithm: providerSubscription.cryptographic_algorithm }),
            ...(providerSubscription.cryptographic_key != null && { cryptographic_key: providerSubscription.cryptographic_key }),
            id: providerSubscription.id,
            ...(providerSubscription.lead_form_id != null && { lead_form_id: providerSubscription.lead_form_id }),
            ...(providerSubscription.user_account_id !== undefined && { user_account_id: providerSubscription.user_account_id }),
            ...(providerSubscription.webhook_url !== undefined && { webhook_url: providerSubscription.webhook_url })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
