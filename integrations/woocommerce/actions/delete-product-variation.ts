import { createAction } from 'nango';
import { z } from 'zod';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    product_id: z.number().describe('The product ID the variation belongs to. Example: 13'),
    variation_id: z.number().describe('The variation ID to delete. Example: 14')
});

const ProviderResponseSchema = z
    .object({
        id: z.number().optional(),
        deleted: z.boolean().optional(),
        previous: z.record(z.string(), z.unknown()).optional(),
        status: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.number(),
    deleted: z.boolean(),
    previous: z.record(z.string(), z.unknown()).optional()
});

const action = createAction({
    description: 'Delete or archive a product variation in WooCommerce.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read', 'write'],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://woocommerce.github.io/woocommerce-rest-api-docs/#delete-a-product-variation
            endpoint: `/wp-json/wc/v3/products/${encodeURIComponent(String(input.product_id))}/variations/${encodeURIComponent(String(input.variation_id))}`,
            params: { force: 'true' },
            retries: 3
        };

        const response = await nango.delete(config);
        const data = ProviderResponseSchema.parse(response.data);

        if (data.deleted === true) {
            return {
                id: input.variation_id,
                deleted: true,
                ...(data.previous !== undefined && { previous: data.previous })
            };
        }

        return {
            id: data.id ?? input.variation_id,
            deleted: true,
            ...(data.status !== undefined && { previous: { status: data.status } })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
