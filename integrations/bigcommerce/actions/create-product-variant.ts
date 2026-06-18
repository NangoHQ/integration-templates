import { z } from 'zod';
import { createAction } from 'nango';

const OptionValueInputSchema = z.object({
    id: z.number().describe('Option value ID. Example: 146'),
    label: z.string().describe('Option value label. Example: "Black"'),
    option_id: z.number().describe('Option ID. Example: 151')
});

const InputSchema = z.object({
    product_id: z.number().describe('Product ID to create the variant for. Example: 192'),
    sku: z.string().describe('Variant SKU. Example: "SMIT-2"'),
    price: z.number().optional().describe('Variant base price. Example: 25'),
    option_values: z.array(OptionValueInputSchema).describe('Array of option value objects defining this variant.')
});

const OptionValueSchema = z.object({
    id: z.number(),
    option_id: z.number(),
    option_display_name: z.string().optional(),
    label: z.string()
});

const VariantSchema = z.object({
    id: z.number(),
    product_id: z.number(),
    sku: z.string(),
    sku_id: z.number().nullable().optional(),
    price: z.number().nullable().optional(),
    cost_price: z.number().nullable().optional(),
    sale_price: z.number().nullable().optional(),
    retail_price: z.number().nullable().optional(),
    weight: z.number().nullable().optional(),
    width: z.number().nullable().optional(),
    height: z.number().nullable().optional(),
    depth: z.number().nullable().optional(),
    is_free_shipping: z.boolean().optional(),
    fixed_cost_shipping_price: z.number().nullable().optional(),
    purchasing_disabled: z.boolean().optional(),
    purchasing_disabled_message: z.string().optional(),
    image_url: z.string().optional(),
    upc: z.string().nullable().optional(),
    mpn: z.string().nullable().optional(),
    gtin: z.string().nullable().optional(),
    inventory_level: z.number().nullable().optional(),
    inventory_warning_level: z.number().nullable().optional(),
    bin_picking_number: z.string().nullable().optional(),
    option_values: z.array(OptionValueSchema).optional(),
    calculated_price: z.number().optional(),
    calculated_weight: z.number().optional()
});

const OutputSchema = z.object({
    id: z.number(),
    product_id: z.number(),
    sku: z.string(),
    sku_id: z.number().nullable().optional(),
    price: z.number().nullable().optional(),
    cost_price: z.number().nullable().optional(),
    sale_price: z.number().nullable().optional(),
    retail_price: z.number().nullable().optional(),
    weight: z.number().nullable().optional(),
    width: z.number().nullable().optional(),
    height: z.number().nullable().optional(),
    depth: z.number().nullable().optional(),
    is_free_shipping: z.boolean().optional(),
    fixed_cost_shipping_price: z.number().nullable().optional(),
    purchasing_disabled: z.boolean().optional(),
    purchasing_disabled_message: z.string().optional(),
    image_url: z.string().optional(),
    upc: z.string().nullable().optional(),
    mpn: z.string().nullable().optional(),
    gtin: z.string().nullable().optional(),
    inventory_level: z.number().nullable().optional(),
    inventory_warning_level: z.number().nullable().optional(),
    bin_picking_number: z.string().nullable().optional(),
    option_values: z.array(OptionValueSchema).optional(),
    calculated_price: z.number().optional(),
    calculated_weight: z.number().optional()
});

const action = createAction({
    description: 'Create a variant for a product.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['store_v2_products'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.bigcommerce.com/docs/rest-management/catalog/product-variants#create-a-product-variant
            endpoint: `/v3/catalog/products/${encodeURIComponent(input.product_id)}/variants`,
            data: {
                sku: input.sku,
                ...(input.price !== undefined && { price: input.price }),
                option_values: input.option_values
            },
            retries: 10
        });

        const parsed = z
            .object({
                data: z.unknown()
            })
            .parse(response.data);

        const variant = VariantSchema.parse(parsed.data);

        return {
            id: variant.id,
            product_id: variant.product_id,
            sku: variant.sku,
            ...(variant.sku_id !== undefined && { sku_id: variant.sku_id }),
            ...(variant.price !== undefined && { price: variant.price }),
            ...(variant.cost_price !== undefined && { cost_price: variant.cost_price }),
            ...(variant.sale_price !== undefined && { sale_price: variant.sale_price }),
            ...(variant.retail_price !== undefined && { retail_price: variant.retail_price }),
            ...(variant.weight !== undefined && { weight: variant.weight }),
            ...(variant.width !== undefined && { width: variant.width }),
            ...(variant.height !== undefined && { height: variant.height }),
            ...(variant.depth !== undefined && { depth: variant.depth }),
            ...(variant.is_free_shipping !== undefined && { is_free_shipping: variant.is_free_shipping }),
            ...(variant.fixed_cost_shipping_price !== undefined && { fixed_cost_shipping_price: variant.fixed_cost_shipping_price }),
            ...(variant.purchasing_disabled !== undefined && { purchasing_disabled: variant.purchasing_disabled }),
            ...(variant.purchasing_disabled_message !== undefined && { purchasing_disabled_message: variant.purchasing_disabled_message }),
            ...(variant.image_url !== undefined && { image_url: variant.image_url }),
            ...(variant.upc !== undefined && { upc: variant.upc }),
            ...(variant.mpn !== undefined && { mpn: variant.mpn }),
            ...(variant.gtin !== undefined && { gtin: variant.gtin }),
            ...(variant.inventory_level !== undefined && { inventory_level: variant.inventory_level }),
            ...(variant.inventory_warning_level !== undefined && { inventory_warning_level: variant.inventory_warning_level }),
            ...(variant.bin_picking_number !== undefined && { bin_picking_number: variant.bin_picking_number }),
            ...(variant.option_values !== undefined && { option_values: variant.option_values }),
            ...(variant.calculated_price !== undefined && { calculated_price: variant.calculated_price }),
            ...(variant.calculated_weight !== undefined && { calculated_weight: variant.calculated_weight })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
