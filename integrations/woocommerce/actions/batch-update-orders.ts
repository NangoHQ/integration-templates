import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const OrderInputSchema = z
    .object({
        id: z.number().optional().describe('Order ID. Required for update operations.')
    })
    .passthrough();

const BatchUpdateOrdersInputSchema = z.object({
    create: z.array(OrderInputSchema).optional(),
    update: z.array(OrderInputSchema).optional(),
    delete: z.array(z.number()).optional()
});

const ProviderOrderSchema = z
    .object({
        id: z.number()
    })
    .passthrough();

const BatchUpdateOrdersOutputSchema = z.object({
    create: z.array(ProviderOrderSchema).optional(),
    update: z.array(ProviderOrderSchema).optional(),
    delete: z.array(ProviderOrderSchema).optional()
});

const action = createAction({
    description: 'Create, update, and delete WooCommerce orders in a batch.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/batch-update-orders',
        group: 'Orders'
    },
    input: BatchUpdateOrdersInputSchema,
    output: BatchUpdateOrdersOutputSchema,
    scopes: ['read', 'write'],

    exec: async (nango, input): Promise<z.infer<typeof BatchUpdateOrdersOutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://woocommerce.github.io/woocommerce-rest-api-docs/#batch-update-orders
            endpoint: '/wp-json/wc/v3/orders/batch',
            data: {
                ...(input.create !== undefined && { create: input.create }),
                ...(input.update !== undefined && { update: input.update }),
                ...(input.delete !== undefined && { delete: input.delete })
            },
            retries: 3
        };

        const response = await nango.post(config);

        const providerResponse = BatchUpdateOrdersOutputSchema.parse(response.data);
        return providerResponse;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
