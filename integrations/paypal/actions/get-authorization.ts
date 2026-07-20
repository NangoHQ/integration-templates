import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    authorization_id: z.string().describe('The PayPal authorization ID. Example: "0VF52814937998046"')
});

const AmountSchema = z.object({
    currency_code: z.string(),
    value: z.string()
});

const SellerProtectionSchema = z.object({
    status: z.string(),
    dispute_categories: z.array(z.string()).optional()
});

const PayeeSchema = z.object({
    email_address: z.string().optional(),
    merchant_id: z.string().optional()
});

const LinkSchema = z.object({
    href: z.string(),
    rel: z.string(),
    method: z.string()
});

const ProviderAuthorizationSchema = z.object({
    id: z.string(),
    status: z.string(),
    amount: AmountSchema.optional(),
    invoice_id: z.string().optional(),
    custom_id: z.string().optional(),
    seller_protection: SellerProtectionSchema.optional(),
    payee: PayeeSchema.optional(),
    expiration_time: z.string().optional(),
    create_time: z.string().optional(),
    update_time: z.string().optional(),
    links: z.array(LinkSchema).optional()
});

const OutputSchema = z.object({
    id: z.string(),
    status: z.string(),
    amount: AmountSchema.optional(),
    invoice_id: z.string().optional(),
    custom_id: z.string().optional(),
    seller_protection: SellerProtectionSchema.optional(),
    payee: PayeeSchema.optional(),
    expiration_time: z.string().optional(),
    create_time: z.string().optional(),
    update_time: z.string().optional(),
    links: z.array(LinkSchema).optional()
});

const action = createAction({
    description: 'Retrieve details for an authorized payment.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://uri.paypal.com/services/payments/payment/authcapture'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.paypal.com/api/payments/v2/#authorizations_get
        const response = await nango.get({
            endpoint: `/v2/payments/authorizations/${encodeURIComponent(input.authorization_id)}`,
            retries: 3
        });

        const providerAuth = ProviderAuthorizationSchema.parse(response.data);

        return {
            id: providerAuth.id,
            status: providerAuth.status,
            ...(providerAuth.amount !== undefined && { amount: providerAuth.amount }),
            ...(providerAuth.invoice_id !== undefined && { invoice_id: providerAuth.invoice_id }),
            ...(providerAuth.custom_id !== undefined && { custom_id: providerAuth.custom_id }),
            ...(providerAuth.seller_protection !== undefined && { seller_protection: providerAuth.seller_protection }),
            ...(providerAuth.payee !== undefined && { payee: providerAuth.payee }),
            ...(providerAuth.expiration_time !== undefined && { expiration_time: providerAuth.expiration_time }),
            ...(providerAuth.create_time !== undefined && { create_time: providerAuth.create_time }),
            ...(providerAuth.update_time !== undefined && { update_time: providerAuth.update_time }),
            ...(providerAuth.links !== undefined && { links: providerAuth.links })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
