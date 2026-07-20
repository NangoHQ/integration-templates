import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    location_ids: z
        .array(z.string())
        .min(1)
        .max(10)
        .describe('Location IDs for the orders to query. Required by Square (1 to 10 IDs per request). Example: ["L6KAXMZ50WFKS"]'),
    limit: z.number().optional().describe('Maximum number of results to return in a single page. Default: 500, Max: 1000.')
});

const MoneySchema = z
    .object({
        amount: z.number().optional(),
        currency: z.string().optional()
    })
    .passthrough();

const OrderSchema = z
    .object({
        id: z.string(),
        location_id: z.string().optional(),
        customer_id: z.string().optional(),
        state: z.string().optional(),
        version: z.number(),
        created_at: z.string().optional(),
        updated_at: z.string().optional(),
        closed_at: z.string().optional(),
        total_money: MoneySchema.optional(),
        total_tax_money: MoneySchema.optional(),
        total_discount_money: MoneySchema.optional(),
        total_tip_money: MoneySchema.optional(),
        total_service_charge_money: MoneySchema.optional(),
        line_items: z.array(z.object({}).passthrough()).optional(),
        discounts: z.array(z.object({}).passthrough()).optional(),
        taxes: z.array(z.object({}).passthrough()).optional(),
        fulfillments: z.array(z.object({}).passthrough()).optional(),
        service_charges: z.array(z.object({}).passthrough()).optional(),
        refunds: z.array(z.object({}).passthrough()).optional(),
        tenders: z.array(z.object({}).passthrough()).optional(),
        metadata: z.record(z.string(), z.string()).optional()
    })
    .passthrough();

const SearchOrdersResponseSchema = z.object({
    orders: z.array(OrderSchema).optional(),
    order_entries: z.array(z.object({}).passthrough()).optional(),
    cursor: z.string().optional(),
    errors: z.array(z.object({}).passthrough()).optional()
});

const OutputSchema = z.object({
    orders: z.array(OrderSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'Search orders.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ORDERS_READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.squareup.com/reference/square/orders-api/search-orders
            endpoint: '/v2/orders/search',
            data: {
                ...(input.cursor !== undefined && { cursor: input.cursor }),
                location_ids: input.location_ids,
                ...(input.limit !== undefined && { limit: input.limit }),
                return_entries: false
            },
            retries: 3
        });

        const parsed = SearchOrdersResponseSchema.parse(response.data);

        if (parsed.errors && parsed.errors.length > 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Square API returned errors during order search',
                errors: parsed.errors
            });
        }

        return {
            orders: parsed.orders || [],
            ...(parsed.cursor !== undefined && { next_cursor: parsed.cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
