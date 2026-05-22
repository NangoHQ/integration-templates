import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    product_id: z.number().describe('The ID of the product to delete. Example: 21'),
    force: z.boolean().optional().describe('If true, permanently delete the product. If false or omitted, the product is moved to trash. Default: false')
});

const ProviderProductSchema = z
    .object({
        id: z.number(),
        name: z.string().optional(),
        type: z.string().optional(),
        status: z.string().optional(),
        sku: z.string().optional(),
        price: z.string().optional(),
        date_created: z.string().optional(),
        date_modified: z.string().optional(),
        date_created_gmt: z.string().optional(),
        date_modified_gmt: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.number(),
    name: z.string().optional(),
    type: z.string().optional(),
    status: z.string().optional(),
    deleted: z.boolean().describe('True if the product was permanently deleted, false if moved to trash'),
    message: z.string().optional()
});

const action = createAction({
    description: 'Delete or archive a product in WooCommerce',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-product',
        group: 'Products'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read', 'write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const force = input.force ?? false;

        // https://woocommerce.github.io/woocommerce-rest-api-docs/#delete-a-product
        const response = await nango.delete({
            endpoint: `/wp-json/wc/v3/products/${encodeURIComponent(input.product_id)}`,
            params: {
                force: force ? 'true' : 'false'
            },
            retries: 3
        });

        // Handle 404 - product not found
        if (response.status === 404) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Product with ID ${input.product_id} not found`,
                product_id: input.product_id
            });
        }

        // WooCommerce returns the deleted product object
        const providerProduct = ProviderProductSchema.parse(response.data);

        return {
            id: providerProduct.id,
            name: providerProduct.name,
            type: providerProduct.type,
            status: providerProduct.status,
            deleted: force,
            message: force ? `Product ${providerProduct.id} permanently deleted` : `Product ${providerProduct.id} moved to trash`
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
