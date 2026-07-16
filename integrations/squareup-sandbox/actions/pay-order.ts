import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    order_id: z.string().describe('The ID of the order to pay. Example: "jb5xcmK9WdiTRRDdRetjAmJpxjJZY"'),
    payment_ids: z.array(z.string()).describe('Payment IDs already created against this order.'),
    idempotency_key: z.string().min(1).max(192).describe('Unique idempotency key for this request. Max length 192.')
});

const MoneySchema = z.object({
    amount: z.number(),
    currency: z.string()
});

const OrderSchema = z
    .object({
        id: z.string(),
        location_id: z.string().optional(),
        state: z.string().optional(),
        version: z.number().optional(),
        created_at: z.string().optional(),
        updated_at: z.string().optional(),
        closed_at: z.string().optional(),
        total_money: MoneySchema.optional(),
        total_tax_money: MoneySchema.optional(),
        total_discount_money: MoneySchema.optional(),
        total_tip_money: MoneySchema.optional(),
        total_service_charge_money: MoneySchema.optional(),
        net_amounts: z
            .object({
                total_money: MoneySchema.optional(),
                tax_money: MoneySchema.optional(),
                discount_money: MoneySchema.optional(),
                tip_money: MoneySchema.optional(),
                service_charge_money: MoneySchema.optional()
            })
            .optional(),
        line_items: z.array(z.object({}).passthrough()).optional(),
        discounts: z.array(z.object({}).passthrough()).optional(),
        tenders: z.array(z.object({}).passthrough()).optional(),
        source: z.object({ name: z.string().optional() }).optional()
    })
    .passthrough();

const OutputSchema = OrderSchema;

const ProviderPayOrderResponseSchema = z.object({
    errors: z
        .array(
            z.object({
                code: z.string(),
                detail: z.string().optional(),
                category: z.string().optional()
            })
        )
        .optional(),
    order: OrderSchema.optional()
});

const action = createAction({
    description: 'Pay an order.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ORDERS_WRITE', 'PAYMENTS_WRITE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.squareup.com/reference/square/orders-api/pay-order
            endpoint: `/v2/orders/${encodeURIComponent(input.order_id)}/pay`,
            data: {
                idempotency_key: input.idempotency_key,
                payment_ids: input.payment_ids
            },
            retries: 3
        });

        const providerResponse = ProviderPayOrderResponseSchema.parse(response.data);

        if (providerResponse.errors && providerResponse.errors.length > 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: providerResponse.errors.map((e) => e.detail || e.code).join(', ')
            });
        }

        if (!providerResponse.order) {
            throw new nango.ActionError({
                type: 'missing_order',
                message: 'Pay order response did not include an order.'
            });
        }

        return providerResponse.order;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
