import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const MoneySchema = z.object({
    amount: z.number(),
    currency: z.string()
});

const InputSchema = z.object({
    payment_id: z.string().describe('The unique ID of the payment being refunded. Example: "f3YEx4hWP1mDncRMtBjc4TM4OKNZY"'),
    amount_money: MoneySchema.describe('The amount of money to refund in the smallest denomination of the applicable currency.'),
    reason: z.string().optional().describe('A description of the reason for the refund.'),
    idempotency_key: z.string().describe('A unique string that identifies this RefundPayment request.'),
    app_fee_money: MoneySchema.optional().describe('The amount of money the developer contributes to help cover the refunded amount.'),
    destination_id: z.string().optional().describe('The ID indicating where funds will be refunded to.'),
    unlinked: z.boolean().optional().describe('Indicates that the refund is not linked to a Square payment.'),
    location_id: z.string().optional().describe('The location ID associated with the unlinked refund.'),
    customer_id: z.string().optional().describe('The Customer ID of the customer associated with the refund.'),
    team_member_id: z.string().optional().describe('An optional TeamMember ID to associate with this refund.')
});

const ProviderRefundSchema = z
    .object({
        id: z.string(),
        status: z.string(),
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

const action = createAction({
    description: 'Refund a payment.',
    version: '1.0.0',
    input: InputSchema,
    output: ProviderRefundSchema,
    scopes: ['PAYMENTS_WRITE'],

    exec: async (nango, input) => {
        const body = {
            idempotency_key: input.idempotency_key,
            payment_id: input.payment_id,
            amount_money: input.amount_money,
            ...(input.reason !== undefined && { reason: input.reason }),
            ...(input.app_fee_money !== undefined && { app_fee_money: input.app_fee_money }),
            ...(input.destination_id !== undefined && { destination_id: input.destination_id }),
            ...(input.unlinked !== undefined && { unlinked: input.unlinked }),
            ...(input.location_id !== undefined && { location_id: input.location_id }),
            ...(input.customer_id !== undefined && { customer_id: input.customer_id }),
            ...(input.team_member_id !== undefined && { team_member_id: input.team_member_id })
        };

        const config: ProxyConfiguration = {
            // https://developer.squareup.com/reference/square/refunds-api/refund-payment
            endpoint: '/v2/refunds',
            data: body,
            retries: 1
        };

        const response = await nango.post(config);

        if (response.data && typeof response.data === 'object' && 'errors' in response.data) {
            const errorData = z
                .object({
                    errors: z.array(z.record(z.string(), z.unknown()))
                })
                .safeParse(response.data);

            if (errorData.success && errorData.data.errors.length > 0) {
                throw new nango.ActionError({
                    type: 'refund_error',
                    message: 'Square refund request failed',
                    errors: errorData.data.errors
                });
            }
        }

        const refundResponse = z
            .object({
                refund: z.unknown()
            })
            .safeParse(response.data);

        if (!refundResponse.success || !refundResponse.data.refund) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Square refunds API'
            });
        }

        const refund = ProviderRefundSchema.parse(refundResponse.data.refund);

        return refund;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
