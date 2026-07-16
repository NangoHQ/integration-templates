import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const MoneySchema = z.object({
    amount: z.number(),
    currency: z.string()
});

// Square's RefundPayment endpoint rejects a request that sets both `unlinked: true` and
// `payment_id` (unlinked refunds must omit payment_id entirely). Modeling this as a
// discriminated union on `unlinked` makes that constraint structural instead of relying on
// callers to know it.
// https://developer.squareup.com/reference/square/refunds-api/refund-payment
const LinkedRefundInputSchema = z.object({
    unlinked: z.literal(false).describe('Set to false for a linked refund of an existing Square payment. payment_id is required in this case.'),
    payment_id: z.string().describe('The unique ID of the payment being refunded. Example: "f3YEx4hWP1mDncRMtBjc4TM4OKNZY"'),
    amount_money: MoneySchema.describe('The amount of money to refund in the smallest denomination of the applicable currency.'),
    idempotency_key: z.string().describe('A unique string that identifies this RefundPayment request.'),
    reason: z.string().optional().describe('A description of the reason for the refund.'),
    app_fee_money: MoneySchema.optional().describe(
        'The amount of money the developer contributes to help cover the refunded amount. Requires the PAYMENTS_WRITE_ADDITIONAL_RECIPIENTS OAuth permission.'
    ),
    destination_id: z.string().optional().describe('Optional ID of a destination to refund to that is different from the original payment source.'),
    team_member_id: z.string().optional().describe('An optional TeamMember ID to associate with this refund.')
});

const UnlinkedRefundInputSchema = z.object({
    unlinked: z.literal(true).describe('Indicates this refund is not linked to a Square payment. payment_id must not be set.'),
    destination_id: z.string().describe('Required for unlinked refunds. The ID indicating where funds will be refunded to, e.g. "CASH" or "EXTERNAL".'),
    location_id: z.string().describe('Required for unlinked refunds. The location ID associated with the unlinked refund.'),
    amount_money: MoneySchema.describe('The amount of money to refund in the smallest denomination of the applicable currency.'),
    idempotency_key: z.string().describe('A unique string that identifies this RefundPayment request.'),
    reason: z.string().optional().describe('A description of the reason for the refund.'),
    app_fee_money: MoneySchema.optional().describe(
        'The amount of money the developer contributes to help cover the refunded amount. Requires the PAYMENTS_WRITE_ADDITIONAL_RECIPIENTS OAuth permission.'
    ),
    customer_id: z.string().optional().describe('The Customer ID of the customer associated with the refund. Only allowed for unlinked refunds.'),
    team_member_id: z.string().optional().describe('An optional TeamMember ID to associate with this refund.'),
    cash_details: z.record(z.string(), z.unknown()).optional().describe('Required when destination_id is "CASH".'),
    external_details: z.record(z.string(), z.unknown()).optional().describe('Required when destination_id is "EXTERNAL".')
});

const InputSchema = z.discriminatedUnion('unlinked', [LinkedRefundInputSchema, UnlinkedRefundInputSchema]);

const ProviderRefundSchema = z
    .object({
        id: z.string(),
        status: z.string().optional(),
        amount_money: MoneySchema,
        app_fee_money: MoneySchema.optional(),
        bank_account_details: z.record(z.string(), z.unknown()).optional(),
        cash_details: z.record(z.string(), z.unknown()).optional(),
        created_at: z.string().optional(),
        destination_id: z.string().optional(),
        destination_type: z.string().optional(),
        external_details: z.record(z.string(), z.unknown()).optional(),
        location_id: z.string().optional(),
        order_id: z.string().optional(),
        payment_id: z.string().optional(),
        processing_fee: z.array(z.record(z.string(), z.unknown())).optional(),
        reason: z.string().optional(),
        team_member_id: z.string().optional(),
        tender_details: z.record(z.string(), z.unknown()).optional(),
        updated_at: z.string().optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    refund: ProviderRefundSchema.optional(),
    errors: z
        .array(
            z.object({
                category: z.string().optional(),
                code: z.string().optional(),
                detail: z.string().optional(),
                field: z.string().optional()
            })
        )
        .optional()
});

const action = createAction({
    description: 'Refund a payment.',
    version: '1.0.0',
    input: InputSchema,
    output: ProviderRefundSchema,
    // PAYMENTS_WRITE_ADDITIONAL_RECIPIENTS is required whenever app_fee_money is set on the
    // request (marketplace/platform refunds that redistribute funds to a secondary recipient).
    // https://developer.squareup.com/reference/square/refunds-api/refund-payment
    scopes: ['PAYMENTS_WRITE', 'PAYMENTS_WRITE_ADDITIONAL_RECIPIENTS'],

    exec: async (nango, input) => {
        const body: Record<string, unknown> = {
            idempotency_key: input.idempotency_key,
            amount_money: input.amount_money,
            unlinked: input.unlinked,
            ...(input.reason !== undefined && { reason: input.reason }),
            ...(input.app_fee_money !== undefined && { app_fee_money: input.app_fee_money }),
            ...(input.destination_id !== undefined && { destination_id: input.destination_id }),
            ...(input.team_member_id !== undefined && { team_member_id: input.team_member_id })
        };

        if (input.unlinked) {
            body['location_id'] = input.location_id;
            if (input.customer_id !== undefined) {
                body['customer_id'] = input.customer_id;
            }
            if (input.cash_details !== undefined) {
                body['cash_details'] = input.cash_details;
            }
            if (input.external_details !== undefined) {
                body['external_details'] = input.external_details;
            }
        } else {
            body['payment_id'] = input.payment_id;
        }

        const config: ProxyConfiguration = {
            // https://developer.squareup.com/reference/square/refunds-api/refund-payment
            endpoint: '/v2/refunds',
            data: body,
            retries: 1
        };

        const response = await nango.post(config);

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.errors && providerResponse.errors.length > 0) {
            const firstError = providerResponse.errors[0];
            throw new nango.ActionError({
                type: 'refund_error',
                message: firstError?.detail || firstError?.code || 'Square refund request failed',
                errors: providerResponse.errors
            });
        }

        if (!providerResponse.refund) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Square refunds API'
            });
        }

        return providerResponse.refund;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
