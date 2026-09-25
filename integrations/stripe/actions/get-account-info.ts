import { z } from 'zod';
import type { ProxyConfiguration } from 'nango';
import { createAction } from 'nango';

const InputSchema = z.object({});

const AccountSchema = z
    .object({
        id: z.string(),
        object: z.literal('account'),
        business_profile: z
            .object({
                mcc: z.string().nullable().optional(),
                name: z.string().nullable().optional(),
                product_description: z.string().nullable().optional(),
                support_address: z.unknown().nullable().optional(),
                support_email: z.string().nullable().optional(),
                support_phone: z.string().nullable().optional(),
                support_url: z.string().nullable().optional(),
                url: z.string().nullable().optional()
            })
            .nullable()
            .optional(),
        business_type: z.string().nullable().optional(),
        capabilities: z.record(z.string(), z.string()).optional(),
        charges_enabled: z.boolean().optional(),
        country: z.string().optional(),
        created: z.number().optional(),
        default_currency: z.string().optional(),
        details_submitted: z.boolean().optional(),
        email: z.string().nullable().optional(),
        payouts_enabled: z.boolean().optional(),
        settings: z.unknown().optional(),
        type: z.string().optional()
    })
    .passthrough();

const action = createAction({
    description: 'Retrieve the Stripe account information for the connected account, including name, country, currency, and enabled capabilities.',
    version: '1.0.0',
    input: InputSchema,
    output: AccountSchema,
    scopes: [],

    exec: async (nango): Promise<z.infer<typeof AccountSchema>> => {
        const config: ProxyConfiguration = {
            // https://docs.stripe.com/api/accounts/retrieve
            endpoint: '/v1/account',
            retries: 3
        };

        const response = await nango.get(config);

        const account = AccountSchema.parse(response.data);

        return account;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
