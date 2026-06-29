import { z } from 'zod';
import { createAction } from 'nango';

const ProductVariantOptionValueSchema = z.object({
    id: z.number(),
    option_id: z.number(),
    option_display_name: z.string(),
    label: z.string()
});

const InputSchema = z.object({
    product_id: z.number().describe('Product ID. Example: 81'),
    variant_id: z.number().describe('Variant ID. Example: 65'),
    cost_price: z.number().nullable().optional().describe('Cost price of the variant.'),
    price: z.number().nullable().optional().describe('Base price of the variant.'),
    sale_price: z.number().nullable().optional().describe('Sale price of the variant.'),
    retail_price: z.number().nullable().optional().describe('Retail price of the variant.'),
    weight: z.number().nullable().optional().describe('Weight of the variant.'),
    width: z.number().nullable().optional().describe('Width of the variant.'),
    height: z.number().nullable().optional().describe('Height of the variant.'),
    depth: z.number().nullable().optional().describe('Depth of the variant.'),
    is_free_shipping: z.boolean().optional().describe('Whether the variant has free shipping.'),
    fixed_cost_shipping_price: z.number().nullable().optional().describe('Fixed shipping cost for the variant.'),
    purchasing_disabled: z.boolean().optional().describe('If true, this variant will not be purchasable.'),
    purchasing_disabled_message: z.string().optional().describe('Message shown when purchasing_disabled is true.'),
    upc: z.string().nullable().optional().describe('UPC code for the variant.'),
    image_url: z.string().optional().describe('Publicly available image URL.'),
    inventory_level: z.number().nullable().optional().describe('Inventory level for the variant.'),
    inventory_warning_level: z.number().nullable().optional().describe('Inventory warning level for the variant.'),
    bin_picking_number: z.string().nullable().optional().describe('Warehouse location identifier.'),
    mpn: z.string().nullable().optional().describe('Manufacturer Part Number.'),
    gtin: z.string().nullable().optional().describe('Global Trade Item Number.'),
    sku: z.string().optional().describe('SKU for the variant.')
});

const ProviderVariantSchema = z.object({
    id: z.number(),
    product_id: z.number(),
    sku: z.string(),
    sku_id: z.number().nullable().optional(),
    cost_price: z.number().nullable().optional(),
    price: z.number().nullable().optional(),
    sale_price: z.number().nullable().optional(),
    retail_price: z.number().nullable().optional(),
    map_price: z.number().nullable().optional(),
    weight: z.number().nullable().optional(),
    width: z.number().nullable().optional(),
    height: z.number().nullable().optional(),
    depth: z.number().nullable().optional(),
    is_free_shipping: z.boolean().optional(),
    fixed_cost_shipping_price: z.number().nullable().optional(),
    purchasing_disabled: z.boolean().optional(),
    purchasing_disabled_message: z.string().optional(),
    upc: z.string().nullable().optional(),
    image_url: z.string().optional(),
    inventory_level: z.number().nullable().optional(),
    inventory_warning_level: z.number().nullable().optional(),
    bin_picking_number: z.string().nullable().optional(),
    mpn: z.string().nullable().optional(),
    gtin: z.string().nullable().optional(),
    calculated_price: z.number().optional(),
    calculated_weight: z.number().optional(),
    option_values: z.array(ProductVariantOptionValueSchema).optional()
});

const OutputSchema = z.object({
    id: z.number().describe('Variant ID.'),
    product_id: z.number().describe('Product ID.'),
    sku: z.string().optional(),
    cost_price: z.number().optional(),
    price: z.number().optional(),
    sale_price: z.number().optional(),
    retail_price: z.number().optional(),
    weight: z.number().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
    depth: z.number().optional(),
    is_free_shipping: z.boolean().optional(),
    fixed_cost_shipping_price: z.number().optional(),
    purchasing_disabled: z.boolean().optional(),
    purchasing_disabled_message: z.string().optional(),
    upc: z.string().optional(),
    image_url: z.string().optional(),
    inventory_level: z.number().optional(),
    inventory_warning_level: z.number().optional(),
    bin_picking_number: z.string().optional(),
    mpn: z.string().optional(),
    gtin: z.string().optional(),
    calculated_price: z.number().optional(),
    calculated_weight: z.number().optional(),
    option_values: z.array(ProductVariantOptionValueSchema).optional()
});

type VariantUpdateBody = {
    cost_price?: number | null;
    price?: number | null;
    sale_price?: number | null;
    retail_price?: number | null;
    weight?: number | null;
    width?: number | null;
    height?: number | null;
    depth?: number | null;
    is_free_shipping?: boolean;
    fixed_cost_shipping_price?: number | null;
    purchasing_disabled?: boolean;
    purchasing_disabled_message?: string;
    upc?: string | null;
    image_url?: string;
    inventory_level?: number | null;
    inventory_warning_level?: number | null;
    bin_picking_number?: string | null;
    mpn?: string | null;
    gtin?: string | null;
    sku?: string;
};

const action = createAction({
    description: 'Update a product variant.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['store_v2_products'],
    endpoint: {
        path: '/actions/update-product-variant',
        method: 'POST'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: VariantUpdateBody = {};
        if (input.cost_price !== undefined) {
            body.cost_price = input.cost_price;
        }
        if (input.price !== undefined) {
            body.price = input.price;
        }
        if (input.sale_price !== undefined) {
            body.sale_price = input.sale_price;
        }
        if (input.retail_price !== undefined) {
            body.retail_price = input.retail_price;
        }
        if (input.weight !== undefined) {
            body.weight = input.weight;
        }
        if (input.width !== undefined) {
            body.width = input.width;
        }
        if (input.height !== undefined) {
            body.height = input.height;
        }
        if (input.depth !== undefined) {
            body.depth = input.depth;
        }
        if (input.is_free_shipping !== undefined) {
            body.is_free_shipping = input.is_free_shipping;
        }
        if (input.fixed_cost_shipping_price !== undefined) {
            body.fixed_cost_shipping_price = input.fixed_cost_shipping_price;
        }
        if (input.purchasing_disabled !== undefined) {
            body.purchasing_disabled = input.purchasing_disabled;
        }
        if (input.purchasing_disabled_message !== undefined) {
            body.purchasing_disabled_message = input.purchasing_disabled_message;
        }
        if (input.upc !== undefined) {
            body.upc = input.upc;
        }
        if (input.image_url !== undefined) {
            body.image_url = input.image_url;
        }
        if (input.inventory_level !== undefined) {
            body.inventory_level = input.inventory_level;
        }
        if (input.inventory_warning_level !== undefined) {
            body.inventory_warning_level = input.inventory_warning_level;
        }
        if (input.bin_picking_number !== undefined) {
            body.bin_picking_number = input.bin_picking_number;
        }
        if (input.mpn !== undefined) {
            body.mpn = input.mpn;
        }
        if (input.gtin !== undefined) {
            body.gtin = input.gtin;
        }
        if (input.sku !== undefined) {
            body.sku = input.sku;
        }

        const response = await nango.put({
            // https://developer.bigcommerce.com/docs/rest-management/catalog/product-variants#update-product-variant
            endpoint: `/v3/catalog/products/${encodeURIComponent(input.product_id)}/variants/${encodeURIComponent(input.variant_id)}`,
            data: body,
            retries: 1
        });

        const responseData = z.object({ data: ProviderVariantSchema }).parse(response.data);
        const variant = responseData.data;

        return {
            id: variant.id,
            product_id: variant.product_id,
            ...(variant.sku !== undefined && { sku: variant.sku }),
            ...(variant.cost_price !== undefined && variant.cost_price !== null && { cost_price: variant.cost_price }),
            ...(variant.price !== undefined && variant.price !== null && { price: variant.price }),
            ...(variant.sale_price !== undefined && variant.sale_price !== null && { sale_price: variant.sale_price }),
            ...(variant.retail_price !== undefined && variant.retail_price !== null && { retail_price: variant.retail_price }),
            ...(variant.weight !== undefined && variant.weight !== null && { weight: variant.weight }),
            ...(variant.width !== undefined && variant.width !== null && { width: variant.width }),
            ...(variant.height !== undefined && variant.height !== null && { height: variant.height }),
            ...(variant.depth !== undefined && variant.depth !== null && { depth: variant.depth }),
            ...(variant.is_free_shipping !== undefined && { is_free_shipping: variant.is_free_shipping }),
            ...(variant.fixed_cost_shipping_price !== undefined &&
                variant.fixed_cost_shipping_price !== null && {
                    fixed_cost_shipping_price: variant.fixed_cost_shipping_price
                }),
            ...(variant.purchasing_disabled !== undefined && { purchasing_disabled: variant.purchasing_disabled }),
            ...(variant.purchasing_disabled_message !== undefined && { purchasing_disabled_message: variant.purchasing_disabled_message }),
            ...(variant.upc !== undefined && variant.upc !== null && { upc: variant.upc }),
            ...(variant.image_url !== undefined && { image_url: variant.image_url }),
            ...(variant.inventory_level !== undefined && variant.inventory_level !== null && { inventory_level: variant.inventory_level }),
            ...(variant.inventory_warning_level !== undefined &&
                variant.inventory_warning_level !== null && {
                    inventory_warning_level: variant.inventory_warning_level
                }),
            ...(variant.bin_picking_number !== undefined && variant.bin_picking_number !== null && { bin_picking_number: variant.bin_picking_number }),
            ...(variant.mpn !== undefined && variant.mpn !== null && { mpn: variant.mpn }),
            ...(variant.gtin !== undefined && variant.gtin !== null && { gtin: variant.gtin }),
            ...(variant.calculated_price !== undefined && { calculated_price: variant.calculated_price }),
            ...(variant.calculated_weight !== undefined && { calculated_weight: variant.calculated_weight }),
            ...(variant.option_values !== undefined && { option_values: variant.option_values })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
