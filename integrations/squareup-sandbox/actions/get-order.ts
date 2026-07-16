import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    order_ids: z.array(z.string()).min(1).describe('Order IDs to retrieve. Example: ["nT6eTFlDa7Ko7PDjNEJX7ij1jpeZY"]')
});

const MoneySchema = z.object({
    amount: z.number().optional(),
    currency: z.string().optional()
});

const OrderSchema = z
    .object({
        id: z.string(),
        location_id: z.string().optional(),
        state: z.string().optional(),
        version: z.number().optional(),
        total_money: MoneySchema.optional(),
        line_items: z.array(z.object({}).passthrough()).optional(),
        created_at: z.string().optional(),
        updated_at: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    orders: z.array(OrderSchema)
});

const BatchRetrieveResponseSchema = z.object({
    orders: z.array(OrderSchema).optional(),
    errors: z.array(z.object({}).passthrough()).optional()
});

const action = createAction({
    description: 'Retrieve one or more orders by ID.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ORDERS_READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.squareup.com/reference/square/orders-api/batch-retrieve-orders
            endpoint: '/v2/orders/batch-retrieve',
            data: {
                order_ids: input.order_ids
            },
            retries: 3
        });

        const parsed = BatchRetrieveResponseSchema.parse(response.data);

        if (parsed.errors && parsed.errors.length > 0) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'Square API returned errors while retrieving orders.',
                errors: parsed.errors
            });
        }

        if (!parsed.orders || parsed.orders.length === 0) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'No orders found for the provided IDs.',
                order_ids: input.order_ids
            });
        }

        return {
            orders: parsed.orders
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
