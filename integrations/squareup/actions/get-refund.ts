import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    refund_id: z
        .string()
        .describe('The unique ID for the desired PaymentRefund. Example: "bP9mAsEMYPUGjjGNaNO5ZDVyLhSZY_69MmgHubkLqx9wGhnmenRUHOaKitE6llfZuxcWYjGxd"')
});

const MoneySchema = z.object({
    amount: z.number().optional(),
    currency: z.string().optional()
});

const ProcessingFeeSchema = z.object({
    effective_at: z.string().optional(),
    type: z.string().optional(),
    amount_money: MoneySchema.optional()
});

const RefundSchema = z.object({
    id: z.string(),
    status: z.string().optional(),
    amount_money: MoneySchema.optional(),
    payment_id: z.string().optional(),
    order_id: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    processing_fee: z.array(ProcessingFeeSchema).optional(),
    location_id: z.string().optional(),
    reason: z.string().optional(),
    app_fee_money: MoneySchema.optional(),
    team_member_id: z.string().optional(),
    tender_id: z.string().optional(),
    version: z.number().optional()
});

const OutputSchema = z.object({
    refund: RefundSchema
});

const action = createAction({
    description: 'Retrieve a refund.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['PAYMENTS_READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.squareup.com/reference/square/refunds-api/get-payment-refund
            endpoint: `/v2/refunds/${encodeURIComponent(input.refund_id)}`,
            retries: 3
        });

        const raw = response.data;
        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Square API'
            });
        }

        const parsed = z
            .object({
                refund: z.unknown().optional(),
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
            })
            .parse(raw);

        if (parsed.errors && parsed.errors.length > 0) {
            const firstError = parsed.errors[0];
            throw new nango.ActionError({
                type: 'provider_error',
                message: firstError?.detail || firstError?.code || 'Square API returned errors',
                errors: parsed.errors
            });
        }

        if (!parsed.refund) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Square API'
            });
        }

        const refund = RefundSchema.parse(parsed.refund);

        return {
            refund
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
