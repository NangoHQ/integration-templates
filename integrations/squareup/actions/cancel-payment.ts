import { z } from 'zod';
import type { ProxyConfiguration } from 'nango';
import { createAction } from 'nango';

const InputSchema = z.object({
    payment_id: z
        .string()
        .describe('The ID of the payment to cancel. Only payments with APPROVED status can be cancelled. Example: "BC5A8XpB9k3D5IOVW3R2bR0pCZ9YY"')
});

const ProviderPaymentSchema = z
    .object({
        id: z.string(),
        status: z.string(),
        amount_money: z
            .object({
                amount: z.number(),
                currency: z.string()
            })
            .optional(),
        total_money: z
            .object({
                amount: z.number(),
                currency: z.string()
            })
            .optional(),
        approved_money: z
            .object({
                amount: z.number(),
                currency: z.string()
            })
            .optional(),
        tip_money: z
            .object({
                amount: z.number(),
                currency: z.string()
            })
            .optional(),
        created_at: z.string().optional(),
        updated_at: z.string().optional(),
        location_id: z.string().optional(),
        order_id: z.string().optional(),
        customer_id: z.string().optional(),
        source_type: z.string().optional(),
        card_details: z.record(z.string(), z.unknown()).optional(),
        risk_evaluation: z.record(z.string(), z.unknown()).optional(),
        processing_fee: z.array(z.record(z.string(), z.unknown())).optional(),
        note: z.string().optional(),
        statement_description: z.string().optional(),
        receipt_number: z.string().optional(),
        receipt_url: z.string().optional(),
        delay_duration: z.string().optional(),
        delay_action: z.string().optional(),
        delayed_until: z.string().optional(),
        version_token: z.string().optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    payment: ProviderPaymentSchema.optional(),
    errors: z.array(z.record(z.string(), z.unknown())).optional()
});

const action = createAction({
    description: 'Cancel (void) a payment that has not yet been captured. Only works on payments in APPROVED status.',
    version: '1.0.0',
    input: InputSchema,
    output: ProviderPaymentSchema,
    scopes: ['PAYMENTS_WRITE'],

    exec: async (nango, input): Promise<z.infer<typeof ProviderPaymentSchema>> => {
        const config: ProxyConfiguration = {
            // https://developer.squareup.com/reference/square/payments-api/cancel-payment
            endpoint: `/v2/payments/${encodeURIComponent(input.payment_id)}/cancel`,
            retries: 3
        };

        const response = await nango.post(config);

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.errors && providerResponse.errors.length > 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Square returned errors when cancelling the payment',
                errors: providerResponse.errors
            });
        }

        if (!providerResponse.payment) {
            throw new nango.ActionError({
                type: 'missing_payment',
                message: 'Payment not found in provider response'
            });
        }

        return providerResponse.payment;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
