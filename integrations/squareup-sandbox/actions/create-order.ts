import { createAction } from 'nango';
import { z } from 'zod';

const MoneySchema = z
    .object({
        amount: z.number().optional(),
        currency: z.string().optional()
    })
    .passthrough();

const OrderLineItemSchema = z
    .object({
        uid: z.string().optional(),
        name: z.string().optional(),
        quantity: z.string(),
        catalog_object_id: z.string().optional(),
        variation_name: z.string().optional(),
        base_price_money: MoneySchema.optional(),
        gross_sales_money: MoneySchema.optional(),
        total_money: MoneySchema.optional(),
        total_discount_money: MoneySchema.optional(),
        total_tax_money: MoneySchema.optional(),
        total_service_charge_money: MoneySchema.optional(),
        applied_discounts: z.array(z.object({}).passthrough()).optional(),
        applied_taxes: z.array(z.object({}).passthrough()).optional(),
        modifiers: z.array(z.object({}).passthrough()).optional()
    })
    .passthrough();

const OrderSchema = z
    .object({
        id: z.string().optional(),
        location_id: z.string(),
        reference_id: z.string().optional(),
        source: z.object({ name: z.string().optional() }).passthrough().optional(),
        customer_id: z.string().optional(),
        line_items: z.array(OrderLineItemSchema).optional(),
        taxes: z.array(z.object({}).passthrough()).optional(),
        discounts: z.array(z.object({}).passthrough()).optional(),
        service_charges: z.array(z.object({}).passthrough()).optional(),
        fulfillments: z.array(z.object({}).passthrough()).optional(),
        created_at: z.string().optional(),
        updated_at: z.string().optional(),
        state: z.string().optional(),
        version: z.number().optional(),
        total_money: MoneySchema.optional(),
        total_tax_money: MoneySchema.optional(),
        total_discount_money: MoneySchema.optional(),
        total_tip_money: MoneySchema.optional(),
        total_service_charge_money: MoneySchema.optional(),
        net_amounts: z.object({}).passthrough().optional()
    })
    .passthrough();

const InputSchema = z.object({
    idempotency_key: z.string().max(192).optional(),
    order: OrderSchema
});

const OutputSchema = z.object({
    order: OrderSchema,
    errors: z.array(z.object({}).passthrough()).optional()
});

export default createAction({
    description: 'Create an order.',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ORDERS_READ', 'ORDERS_WRITE'],
    exec: async (nango, input) => {
        const config = {
            // https://developer.squareup.com/reference/square/orders-api/create-order
            endpoint: '/v2/orders',
            retries: 3,
            data: input
        };

        const response = await nango.post(config);

        const parsed = OutputSchema.safeParse(response.data);
        if (!parsed.success) {
            await nango.log('Square create order response validation failed', { level: 'error' });
            throw new nango.ActionError({
                message: 'Invalid response from Square API',
                details: parsed.error.issues
            });
        }

        if (parsed.data.errors && parsed.data.errors.length > 0) {
            throw new nango.ActionError({
                message: 'Square API returned errors',
                details: parsed.data.errors
            });
        }

        if (!parsed.data.order) {
            throw new nango.ActionError({
                message: 'Square API did not return an order'
            });
        }

        return parsed.data;
    }
});
