import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    payment_method: z.string().describe('Payment method ID. Example: "pm_1Q0PsIJvEtkwdCNYMSaVuRz6"')
});

const BillingDetailsAddressSchema = z.object({
    city: z.string().nullable().optional(),
    country: z.string().nullable().optional(),
    line1: z.string().nullable().optional(),
    line2: z.string().nullable().optional(),
    postal_code: z.string().nullable().optional(),
    state: z.string().nullable().optional()
});

const BillingDetailsSchema = z.object({
    address: BillingDetailsAddressSchema.nullable().optional(),
    email: z.string().nullable().optional(),
    name: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    tax_id: z.string().nullable().optional()
});

const PaymentMethodSchema = z
    .object({
        id: z.string(),
        object: z.string(),
        allow_redisplay: z.enum(['always', 'limited', 'unspecified']).nullable().optional(),
        billing_details: BillingDetailsSchema.optional(),
        created: z.number(),
        customer: z.string().nullable().optional(),
        livemode: z.boolean(),
        metadata: z.record(z.string(), z.string()).nullable().optional(),
        type: z.string()
    })
    .passthrough();

const action = createAction({
    description: 'Retrieve a single payment method from Stripe.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-payment-method',
        group: 'Payment Methods'
    },
    input: InputSchema,
    output: PaymentMethodSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof PaymentMethodSchema>> => {
        const response = await nango.get({
            // https://docs.stripe.com/api/payment_methods/retrieve
            endpoint: `/v1/payment_methods/${encodeURIComponent(input.payment_method)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Payment method not found',
                payment_method: input.payment_method
            });
        }

        const paymentMethod = PaymentMethodSchema.parse(response.data);

        return paymentMethod;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
