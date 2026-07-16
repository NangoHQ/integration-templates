import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const MoneySchema = z.object({
    amount: z.number(),
    currency: z.string()
});

const InputSchema = z.object({
    idempotency_key: z.string().describe('Unique idempotency key for this request. Example: "7b0f3ec5-086a-4871-8f13-3c81b3875218"'),
    source_id: z.string().describe('Source of funds for this payment. In sandbox use "cnon:card-nonce-ok". Example: "ccof:GaJGNaZa8x4OgDJn4GB"'),
    amount_money: MoneySchema.describe('Amount to charge, in smallest currency denomination. Example: { amount: 1000, currency: "USD" }'),
    location_id: z.string().optional().describe('Location ID to associate with the payment. Example: "L88917AVBK2S5"'),
    autocomplete: z.boolean().optional().describe('If false, creates an APPROVED (uncaptured) payment. Default: true'),
    customer_id: z.string().optional().describe('Customer ID associated with the payment. Example: "W92WH6P11H4Z77CTET0RNTGFW8"'),
    order_id: z.string().optional().describe('Previously created order ID to associate with this payment. Example: "pRsjRTgFWATl7so6DxdKBJa7ssbZY"'),
    reference_id: z.string().optional().describe('User-defined ID to associate with the payment. Example: "123456"'),
    note: z.string().optional().describe('Optional note. Example: "Brief description"'),
    tip_money: MoneySchema.optional().describe('Tip amount'),
    app_fee_money: MoneySchema.optional().describe('App fee amount'),
    buyer_email_address: z.string().optional().describe('Buyer email address'),
    buyer_phone_number: z.string().optional().describe('Buyer phone number'),
    delay_duration: z.string().optional().describe('Delay duration in RFC 3339 format. Example: "P7D"'),
    delay_action: z.string().optional().describe('Action when delay expires: CANCEL or COMPLETE'),
    accept_partial_authorization: z.boolean().optional().describe('Allow partial authorization for gift cards')
});

const ProviderPaymentSchema = z.object({
    id: z.string(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    amount_money: MoneySchema.optional(),
    tip_money: MoneySchema.optional(),
    app_fee_money: MoneySchema.optional(),
    status: z.string().optional(),
    delay_duration: z.string().optional(),
    source_type: z.string().optional(),
    location_id: z.string().optional(),
    order_id: z.string().optional(),
    reference_id: z.string().optional(),
    note: z.string().optional(),
    customer_id: z.string().optional(),
    total_money: MoneySchema.optional(),
    approved_money: MoneySchema.optional(),
    receipt_number: z.string().optional(),
    receipt_url: z.string().optional(),
    delay_action: z.string().optional(),
    delayed_until: z.string().optional(),
    version_token: z.string().optional()
});

const OutputSchema = ProviderPaymentSchema;

const action = createAction({
    description: 'Create a payment.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['PAYMENTS_WRITE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const locationsConfig: ProxyConfiguration = {
            // https://developer.squareup.com/reference/square/locations-api/list-locations
            endpoint: '/v2/locations',
            retries: 3
        };
        const locationsResponse = await nango.get(locationsConfig);

        const LocationsResponseSchema = z.object({
            locations: z
                .array(
                    z.object({
                        id: z.string(),
                        capabilities: z.array(z.string()).optional()
                    })
                )
                .optional()
        });

        const locationsData = LocationsResponseSchema.parse(locationsResponse.data);
        const locations = locationsData.locations || [];

        let targetLocation = locations.find((loc) => loc.id === input.location_id);

        if (!targetLocation && input.location_id) {
            throw new nango.ActionError({
                type: 'invalid_location',
                message: `Location ${input.location_id} not found.`
            });
        }

        if (!targetLocation) {
            targetLocation = locations.find((loc) => loc.capabilities?.includes('CREDIT_CARD_PROCESSING'));
        }

        if (!targetLocation) {
            throw new nango.ActionError({
                type: 'payment_not_enabled',
                message: 'No location found with CREDIT_CARD_PROCESSING capability.'
            });
        }

        if (!targetLocation.capabilities?.includes('CREDIT_CARD_PROCESSING')) {
            throw new nango.ActionError({
                type: 'payment_not_enabled',
                message: `Location ${targetLocation.id} does not have the CREDIT_CARD_PROCESSING capability.`
            });
        }

        const paymentBody: Record<string, unknown> = {
            idempotency_key: input.idempotency_key,
            source_id: input.source_id,
            amount_money: input.amount_money,
            location_id: targetLocation.id
        };

        if (input.autocomplete !== undefined) {
            paymentBody['autocomplete'] = input.autocomplete;
        }

        if (input.customer_id !== undefined) {
            paymentBody['customer_id'] = input.customer_id;
        }

        if (input.order_id !== undefined) {
            paymentBody['order_id'] = input.order_id;
        }

        if (input.reference_id !== undefined) {
            paymentBody['reference_id'] = input.reference_id;
        }

        if (input.note !== undefined) {
            paymentBody['note'] = input.note;
        }

        if (input.tip_money !== undefined) {
            paymentBody['tip_money'] = input.tip_money;
        }

        if (input.app_fee_money !== undefined) {
            paymentBody['app_fee_money'] = input.app_fee_money;
        }

        if (input.buyer_email_address !== undefined) {
            paymentBody['buyer_email_address'] = input.buyer_email_address;
        }

        if (input.buyer_phone_number !== undefined) {
            paymentBody['buyer_phone_number'] = input.buyer_phone_number;
        }

        if (input.delay_duration !== undefined) {
            paymentBody['delay_duration'] = input.delay_duration;
        }

        if (input.delay_action !== undefined) {
            paymentBody['delay_action'] = input.delay_action;
        }

        if (input.accept_partial_authorization !== undefined) {
            paymentBody['accept_partial_authorization'] = input.accept_partial_authorization;
        }

        const paymentConfig: ProxyConfiguration = {
            // https://developer.squareup.com/reference/square/payments-api/create-payment
            endpoint: '/v2/payments',
            data: paymentBody,
            retries: 3
        };
        const response = await nango.post(paymentConfig);

        const CreatePaymentResponseSchema = z.object({
            payment: ProviderPaymentSchema.optional(),
            errors: z
                .array(
                    z.object({
                        code: z.string(),
                        category: z.string().optional(),
                        detail: z.string().optional()
                    })
                )
                .optional()
        });

        const responseData = CreatePaymentResponseSchema.parse(response.data);

        if (responseData.errors && responseData.errors.length > 0) {
            const firstError = responseData.errors[0];
            if (!firstError) {
                throw new nango.ActionError({
                    type: 'unexpected_error',
                    message: 'Error array was unexpectedly empty.'
                });
            }
            throw new nango.ActionError({
                type: 'square_api_error',
                message: firstError.detail || firstError.code,
                code: firstError.code
            });
        }

        if (!responseData.payment) {
            throw new nango.ActionError({
                type: 'unexpected_error',
                message: 'Payment was not returned in the response.'
            });
        }

        return responseData.payment;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
