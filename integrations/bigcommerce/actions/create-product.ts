import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('Product name. Example: "BigCommerce Coffee Mug"'),
    type: z.enum(['physical', 'digital']).describe('Product type. Example: "physical"'),
    weight: z.number().describe('Product weight. Example: 4'),
    price: z.number().describe('Product price. Example: 10'),
    categories: z.array(z.number()).describe('Array of category IDs. Example: [18, 19]'),
    sku: z.string().optional().describe('Product SKU. Example: "SKU-123"'),
    description: z.string().optional().describe('Product description. Example: "<h4>Great T-shirt</h4>The best t-shirt ever."'),
    brand_id: z.number().optional().describe('Brand ID. Example: 1'),
    inventory_level: z.number().optional().describe('Inventory level. Example: 100'),
    is_visible: z.boolean().optional().describe('Whether the product is visible on the storefront. Example: true')
});

const ProviderProductSchema = z.object({
    id: z.number(),
    name: z.string(),
    type: z.enum(['physical', 'digital']),
    sku: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    weight: z.number().optional().nullable(),
    width: z.number().optional().nullable(),
    depth: z.number().optional().nullable(),
    height: z.number().optional().nullable(),
    price: z.number().optional().nullable(),
    cost_price: z.number().optional().nullable(),
    retail_price: z.number().optional().nullable(),
    sale_price: z.number().optional().nullable(),
    map_price: z.number().optional().nullable(),
    tax_class_id: z.number().optional().nullable(),
    product_tax_code: z.string().optional().nullable(),
    categories: z.array(z.number()).optional(),
    brand_id: z.number().optional().nullable(),
    inventory_level: z.number().optional().nullable(),
    inventory_warning_level: z.number().optional().nullable(),
    inventory_tracking: z.string().optional().nullable(),
    fixed_cost_shipping_price: z.number().optional().nullable(),
    is_free_shipping: z.boolean().optional().nullable(),
    is_visible: z.boolean().optional().nullable(),
    is_featured: z.boolean().optional().nullable(),
    related_products: z.array(z.number()).optional(),
    warranty: z.string().optional().nullable(),
    bin_picking_number: z.string().optional().nullable(),
    layout_file: z.string().optional().nullable(),
    upc: z.string().optional().nullable(),
    search_keywords: z.string().optional().nullable(),
    availability: z.string().optional().nullable(),
    availability_description: z.string().optional().nullable(),
    condition: z.string().optional().nullable(),
    is_condition_shown: z.boolean().optional().nullable(),
    order_quantity_minimum: z.number().optional().nullable(),
    order_quantity_maximum: z.number().optional().nullable(),
    page_title: z.string().optional().nullable(),
    meta_keywords: z.array(z.string()).optional().nullable(),
    meta_description: z.string().optional().nullable(),
    view_count: z.number().optional().nullable(),
    preorder_release_date: z.string().optional().nullable(),
    preorder_message: z.string().optional().nullable(),
    is_preorder_only: z.boolean().optional().nullable(),
    is_price_hidden: z.boolean().optional().nullable(),
    price_hidden_label: z.string().optional().nullable(),
    gtin: z.string().optional().nullable(),
    mpn: z.string().optional().nullable(),
    date_created: z.string().optional().nullable(),
    date_modified: z.string().optional().nullable(),
    date_last_imported: z.string().optional().nullable(),
    reviews_rating_sum: z.number().optional().nullable(),
    reviews_count: z.number().optional().nullable(),
    total_sold: z.number().optional().nullable(),
    custom_url: z.object({ url: z.string().optional(), is_customized: z.boolean().optional() }).optional().nullable(),
    base_variant_id: z.number().optional().nullable(),
    calculated_price: z.number().optional().nullable()
});

const OutputSchema = z.object({
    id: z.number(),
    name: z.string(),
    type: z.string(),
    sku: z.string().optional(),
    description: z.string().optional(),
    weight: z.number().optional(),
    price: z.number().optional(),
    categories: z.array(z.number()).optional(),
    brand_id: z.number().optional(),
    inventory_level: z.number().optional(),
    is_visible: z.boolean().optional(),
    date_created: z.string().optional(),
    date_modified: z.string().optional()
});

const action = createAction({
    description: 'Create a product.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['store_v2_products'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {
            name: input.name,
            type: input.type,
            weight: input.weight,
            price: input.price,
            categories: input.categories
        };

        if (input.sku !== undefined) {
            body['sku'] = input.sku;
        }
        if (input.description !== undefined) {
            body['description'] = input.description;
        }
        if (input.brand_id !== undefined) {
            body['brand_id'] = input.brand_id;
        }
        if (input.inventory_level !== undefined) {
            body['inventory_level'] = input.inventory_level;
        }
        if (input.is_visible !== undefined) {
            body['is_visible'] = input.is_visible;
        }

        // https://developer.bigcommerce.com/docs/rest-management/catalog/products#create-product
        const response = await nango.post({
            endpoint: '/v3/catalog/products',
            data: body,
            retries: 3
        });

        const responseData = z.object({ data: ProviderProductSchema }).safeParse(response.data);

        if (!responseData.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response shape from BigCommerce.',
                details: responseData.error.issues.map((issue) => issue.message)
            });
        }

        const product = responseData.data.data;

        return {
            id: product.id,
            name: product.name,
            type: product.type,
            ...(product.sku != null && { sku: product.sku }),
            ...(product.description != null && { description: product.description }),
            ...(product.weight != null && { weight: product.weight }),
            ...(product.price != null && { price: product.price }),
            ...(product.categories != null && { categories: product.categories }),
            ...(product.brand_id != null && { brand_id: product.brand_id }),
            ...(product.inventory_level != null && { inventory_level: product.inventory_level }),
            ...(product.is_visible != null && { is_visible: product.is_visible }),
            ...(product.date_created != null && { date_created: product.date_created }),
            ...(product.date_modified != null && { date_modified: product.date_modified })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
