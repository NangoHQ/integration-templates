import { z } from 'zod';
import { createAction } from 'nango';
import { randomUUID } from 'crypto';

const InputSchema = z.object({
    authorization_id: z.string().describe('The PayPal-generated ID for the authorized payment to void. Example: "8SB03390E2732144X"'),
    request_id: z
        .string()
        .regex(/^[\x21-\x7E]{1,256}$/, 'request_id must be 1-256 printable ASCII characters.')
        .optional()
        .describe('Optional idempotency key sent as PayPal-Request-Id. If omitted, a random one is generated per execution.')
});

const AmountSchema = z.object({
    currency_code: z.string(),
    value: z.string()
});

const SellerProtectionSchema = z.object({
    status: z.string(),
    dispute_categories: z.array(z.string()).optional()
});

const LinkSchema = z.object({
    href: z.string(),
    rel: z.string(),
    method: z.string()
});

const ProviderAuthorizationSchema = z.object({
    id: z.string(),
    status: z.string(),
    amount: AmountSchema,
    invoice_id: z.string().optional(),
    seller_protection: SellerProtectionSchema.optional(),
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
    seller_protection: SellerProtectionSchema.optional(),
    expiration_time: z.string().optional(),
    create_time: z.string().optional(),
    update_time: z.string().optional(),
    links: z.array(LinkSchema).optional()
});

const action = createAction({
    description: 'Void, or cancel, an authorized payment so it can no longer be captured.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://uri.paypal.com/services/payments/payment/authcapture'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.paypal.com/docs/api/payments/v2/
            endpoint: `/v2/payments/authorizations/${encodeURIComponent(input.authorization_id)}/void`,
            headers: {
                Prefer: 'return=representation',
                // One idempotency key per execution so all internal retries resolve to the same void result.
                'PayPal-Request-Id': input.request_id ?? randomUUID()
            },
            data: {},
            retries: 10
        });

        const authorization = ProviderAuthorizationSchema.parse(response.data);

        return {
            id: authorization.id,
            status: authorization.status,
            ...(authorization.amount !== undefined && { amount: authorization.amount }),
            ...(authorization.invoice_id !== undefined && { invoice_id: authorization.invoice_id }),
            ...(authorization.seller_protection !== undefined && { seller_protection: authorization.seller_protection }),
            ...(authorization.expiration_time !== undefined && { expiration_time: authorization.expiration_time }),
            ...(authorization.create_time !== undefined && { create_time: authorization.create_time }),
            ...(authorization.update_time !== undefined && { update_time: authorization.update_time }),
            ...(authorization.links !== undefined && { links: authorization.links })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
