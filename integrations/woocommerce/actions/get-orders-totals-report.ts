import { createAction } from 'nango';
import { z } from 'zod';

/**
 * Input schema for Get Orders Totals Report action.
 * This action has no input parameters.
 */
const InputSchema = z.object({});

/**
 * Provider response schema for an order totals item.
 * Based on WooCommerce REST API documentation.
 */
const ProviderOrderTotalsSchema = z.object({
    slug: z.string().describe('Order status slug. Example: "pending", "processing", "completed"'),
    name: z.string().describe('Human-readable order status name. Example: "Pending payment"'),
    total: z.number().describe('Number of orders with this status')
});

/**
 * Output schema for Get Orders Totals Report action.
 * Returns an array of order status totals.
 */
const OutputSchema = z.array(ProviderOrderTotalsSchema);

const action = createAction({
    description: 'Retrieve the orders totals report from WooCommerce.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango): Promise<z.infer<typeof OutputSchema>> => {
        // https://woocommerce.github.io/woocommerce-rest-api-docs/#retrieve-orders-totals
        const response = await nango.get({
            endpoint: '/wp-json/wc/v3/reports/orders/totals',
            retries: 3
        });

        const totals = z.array(ProviderOrderTotalsSchema).parse(response.data);

        return totals;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
