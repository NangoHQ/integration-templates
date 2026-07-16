import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const MoneySchema = z.object({
    amount: z.number(),
    currency: z.string()
});

// Square requires seller_supplied_money for unlinked cash refunds; change_back_money is
// read-only (computed by Square) and is not a valid request field.
// https://developer.squareup.com/reference/square/objects/DestinationDetailsCashRefundDetails
const CashRefundDetailsSchema = z.object({
    seller_supplied_money: MoneySchema.describe('The amount and currency of the money supplied by the seller.')
});

// https://developer.squareup.com/reference/square/objects/DestinationDetailsExternalRefundDetails
const ExternalRefundDetailsSchema = z.object({
    type: z.string().max(50).describe('The type of external refund. Example: "CHECK", "BANK_TRANSFER", "CRYPTO", "SQUARE_CASH".'),
    source: z.string().max(255).describe('A description of the external refund source. Example: "Bank of America".'),
    source_id: z.string().max(255).optional().describe('An optional ID for the external refund source.')
});

// Square's RefundPayment endpoint rejects a request that sets both `unlinked: true` and
// `payment_id` (unlinked refunds must omit payment_id entirely), and likewise rejects
// `location_id`/`customer_id` on a linked refund. Modeling this as a union of two `.strict()`
// schemas makes both constraints structural: an unrecognized/conflicting field is rejected by
// Zod instead of being silently stripped.
// https://developer.squareup.com/reference/square/refunds-api/refund-payment
const LinkedRefundInputSchema = z
    .object({
        // Square defaults `unlinked` to false when omitted, so it must stay optional here for a
        // caller who never sets it to still get a valid linked refund.
        unlinked: z
            .literal(false)
            .optional()
            .describe('Set to false for a linked refund of an existing Square payment. payment_id is required in this case. Defaults to false.'),
        payment_id: z.string().describe('The unique ID of the payment being refunded. Example: "f3YEx4hWP1mDncRMtBjc4TM4OKNZY"'),
        amount_money: MoneySchema.describe('The amount of money to refund in the smallest denomination of the applicable currency.'),
        idempotency_key: z.string().min(1).max(45).describe('A unique string that identifies this RefundPayment request. Max length 45.'),
        reason: z.string().max(192).optional().describe('A description of the reason for the refund.'),
        app_fee_money: MoneySchema.optional().describe(
            'The amount of money the developer contributes to help cover the refunded amount. Requires the PAYMENTS_WRITE_ADDITIONAL_RECIPIENTS OAuth permission.'
        ),
        destination_id: z.string().optional().describe('Optional ID of a destination to refund to that is different from the original payment source.'),
        team_member_id: z.string().max(192).optional().describe('An optional TeamMember ID to associate with this refund.')
    })
    .strict();

const UnlinkedRefundInputSchema = z
    .object({
        unlinked: z.literal(true).describe('Indicates this refund is not linked to a Square payment. payment_id must not be set.'),
        destination_id: z.string().describe('Required for unlinked refunds. The ID indicating where funds will be refunded to, e.g. "CASH" or "EXTERNAL".'),
        location_id: z.string().describe('Required for unlinked refunds. The location ID associated with the unlinked refund.'),
        amount_money: MoneySchema.describe('The amount of money to refund in the smallest denomination of the applicable currency.'),
        idempotency_key: z.string().min(1).max(45).describe('A unique string that identifies this RefundPayment request. Max length 45.'),
        reason: z.string().max(192).optional().describe('A description of the reason for the refund.'),
        app_fee_money: MoneySchema.optional().describe(
            'The amount of money the developer contributes to help cover the refunded amount. Requires the PAYMENTS_WRITE_ADDITIONAL_RECIPIENTS OAuth permission.'
        ),
        customer_id: z.string().optional().describe('The Customer ID of the customer associated with the refund. Only allowed for unlinked refunds.'),
        team_member_id: z.string().max(192).optional().describe('An optional TeamMember ID to associate with this refund.'),
        cash_details: CashRefundDetailsSchema.optional().describe('Required when destination_id is "CASH".'),
        external_details: ExternalRefundDetailsSchema.optional().describe('Required when destination_id is "EXTERNAL".')
    })
    .strict()
    .superRefine((data, ctx) => {
        if (data.destination_id === 'CASH' && !data.cash_details) {
            ctx.addIssue({ code: 'custom', message: 'cash_details is required when destination_id is "CASH".', path: ['cash_details'] });
        }
        if (data.destination_id === 'EXTERNAL' && !data.external_details) {
            ctx.addIssue({ code: 'custom', message: 'external_details is required when destination_id is "EXTERNAL".', path: ['external_details'] });
        }
    });

const InputSchema = z.union([LinkedRefundInputSchema, UnlinkedRefundInputSchema]);

// Square nests cash/external refund details under `destination_details`, not at the top level
// of the refund object (confirmed against a live sandbox refund response).
const DestinationDetailsSchema = z
    .object({
        cash_details: z
            .object({
                seller_supplied_money: MoneySchema.optional(),
                change_back_money: MoneySchema.optional()
            })
            .optional(),
        card_details: z.record(z.string(), z.unknown()).optional(),
        external_details: z
            .object({
                type: z.string().optional(),
                source: z.string().optional(),
                source_id: z.string().optional()
            })
            .optional()
    })
    .passthrough();

const ProviderRefundSchema = z
    .object({
        id: z.string(),
        status: z.string().optional(),
        amount_money: MoneySchema,
        app_fee_money: MoneySchema.optional(),
        bank_account_details: z.record(z.string(), z.unknown()).optional(),
        created_at: z.string().optional(),
        destination_id: z.string().optional(),
        destination_type: z.string().optional(),
        destination_details: DestinationDetailsSchema.optional(),
        location_id: z.string().optional(),
        order_id: z.string().optional(),
        payment_id: z.string().optional(),
        processing_fee: z.array(z.record(z.string(), z.unknown())).optional(),
        reason: z.string().optional(),
        team_member_id: z.string().optional(),
        tender_details: z.record(z.string(), z.unknown()).optional(),
        unlinked: z.boolean().optional(),
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
            ...(input.unlinked !== undefined && { unlinked: input.unlinked }),
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
