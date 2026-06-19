import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    product_id: z.number().describe('Parent product ID. Example: 13'),
    variation_id: z.number().describe('Product variation ID. Example: 16'),
    regular_price: z.string().optional().describe('Variation regular price.'),
    sale_price: z.string().optional().describe('Variation sale price.'),
    stock_quantity: z.number().optional().describe('Stock quantity.'),
    stock_status: z.string().optional().describe('Stock status. Options: instock, outofstock, onbackorder.'),
    weight: z.string().optional().describe('Variation weight.'),
    description: z.string().optional().describe('Variation description.'),
    sku: z.string().optional().describe('Unique identifier.'),
    manage_stock: z.boolean().optional().describe('Stock management at variation level.'),
    tax_status: z.string().optional().describe('Tax status. Options: taxable, shipping, none.'),
    tax_class: z.string().optional().describe('Tax class.'),
    status: z.string().optional().describe('Variation status. Options: draft, pending, private, publish.'),
    menu_order: z.number().optional().describe('Menu order.')
});

const ProviderVariationSchema = z.object({
    id: z.number(),
    sku: z.string().nullable().optional(),
    price: z.string().nullable().optional(),
    regular_price: z.string().nullable().optional(),
    sale_price: z.string().nullable().optional(),
    stock_quantity: z.number().nullable().optional(),
    stock_status: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
    weight: z.string().nullable().optional(),
    description: z.string().nullable().optional()
});

const OutputSchema = z.object({
    id: z.number(),
    sku: z.string().optional(),
    price: z.string().optional(),
    regular_price: z.string().optional(),
    sale_price: z.string().optional(),
    stock_quantity: z.number().optional(),
    stock_status: z.string().optional(),
    status: z.string().optional(),
    weight: z.string().optional(),
    description: z.string().optional()
});

const action = createAction({
    description: 'Update a product variation in WooCommerce.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.patch({
            // https://woocommerce.github.io/woocommerce-rest-api-docs/#product-variations
            endpoint: `/wp-json/wc/v3/products/${encodeURIComponent(String(input.product_id))}/variations/${encodeURIComponent(String(input.variation_id))}`,
            data: {
                ...(input.regular_price !== undefined && { regular_price: input.regular_price }),
                ...(input.sale_price !== undefined && { sale_price: input.sale_price }),
                ...(input.stock_quantity !== undefined && { stock_quantity: input.stock_quantity }),
                ...(input.stock_status !== undefined && { stock_status: input.stock_status }),
                ...(input.weight !== undefined && { weight: input.weight }),
                ...(input.description !== undefined && { description: input.description }),
                ...(input.sku !== undefined && { sku: input.sku }),
                ...(input.manage_stock !== undefined && { manage_stock: input.manage_stock }),
                ...(input.tax_status !== undefined && { tax_status: input.tax_status }),
                ...(input.tax_class !== undefined && { tax_class: input.tax_class }),
                ...(input.status !== undefined && { status: input.status }),
                ...(input.menu_order !== undefined && { menu_order: input.menu_order })
            },
            retries: 1
        });

        const providerVariation = ProviderVariationSchema.parse(response.data);

        return {
            id: providerVariation.id,
            ...(providerVariation.sku != null && { sku: providerVariation.sku }),
            ...(providerVariation.price != null && { price: providerVariation.price }),
            ...(providerVariation.regular_price != null && { regular_price: providerVariation.regular_price }),
            ...(providerVariation.sale_price != null && { sale_price: providerVariation.sale_price }),
            ...(providerVariation.stock_quantity != null && { stock_quantity: providerVariation.stock_quantity }),
            ...(providerVariation.stock_status != null && { stock_status: providerVariation.stock_status }),
            ...(providerVariation.status != null && { status: providerVariation.status }),
            ...(providerVariation.weight != null && { weight: providerVariation.weight }),
            ...(providerVariation.description != null && { description: providerVariation.description })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
