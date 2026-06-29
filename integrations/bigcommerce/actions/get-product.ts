import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    product_id: z.number().describe('Product ID. Example: 77')
});

const ProviderProductSchema = z.object({
    id: z.number(),
    name: z.string(),
    type: z.string().optional(),
    sku: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    weight: z.number().nullable().optional(),
    width: z.number().nullable().optional(),
    depth: z.number().nullable().optional(),
    height: z.number().nullable().optional(),
    price: z.number().nullable().optional(),
    cost_price: z.number().nullable().optional(),
    retail_price: z.number().nullable().optional(),
    sale_price: z.number().nullable().optional(),
    map_price: z.number().nullable().optional(),
    tax_class_id: z.number().nullable().optional(),
    product_tax_code: z.string().nullable().optional(),
    calculated_price: z.number().nullable().optional(),
    categories: z.array(z.number()).optional(),
    brand_id: z.number().nullable().optional(),
    option_set_id: z.number().nullable().optional(),
    option_set_display: z.string().nullable().optional(),
    inventory_level: z.number().nullable().optional(),
    inventory_warning_level: z.number().nullable().optional(),
    inventory_tracking: z.string().optional(),
    reviews_rating_sum: z.number().nullable().optional(),
    reviews_count: z.number().nullable().optional(),
    total_sold: z.number().nullable().optional(),
    fixed_cost_shipping_price: z.number().nullable().optional(),
    is_free_shipping: z.boolean().optional(),
    is_visible: z.boolean().optional(),
    is_featured: z.boolean().optional(),
    related_products: z.array(z.number()).optional(),
    warranty: z.string().nullable().optional(),
    bin_picking_number: z.string().nullable().optional(),
    layout_file: z.string().nullable().optional(),
    upc: z.string().nullable().optional(),
    mpn: z.string().nullable().optional(),
    gtin: z.string().nullable().optional(),
    date_last_imported: z.string().nullable().optional(),
    search_keywords: z.string().nullable().optional(),
    availability: z.string().optional(),
    availability_description: z.string().nullable().optional(),
    gift_wrapping_options_type: z.string().optional(),
    gift_wrapping_options_list: z.array(z.string()).optional(),
    sort_order: z.number().nullable().optional(),
    condition: z.string().optional(),
    is_condition_shown: z.boolean().optional(),
    order_quantity_minimum: z.number().nullable().optional(),
    order_quantity_maximum: z.number().nullable().optional(),
    page_title: z.string().nullable().optional(),
    meta_keywords: z.array(z.string()).nullable().optional(),
    meta_description: z.string().nullable().optional(),
    date_created: z.string().optional(),
    date_modified: z.string().optional(),
    view_count: z.number().nullable().optional(),
    preorder_release_date: z.string().nullable().optional(),
    preorder_message: z.string().nullable().optional(),
    is_preorder_only: z.boolean().optional(),
    is_price_hidden: z.boolean().optional(),
    price_hidden_label: z.string().nullable().optional(),
    custom_url: z
        .object({
            url: z.string(),
            is_customized: z.boolean()
        })
        .nullable()
        .optional(),
    base_variant_id: z.number().nullable().optional(),
    open_graph_type: z.string().nullable().optional(),
    open_graph_title: z.string().nullable().optional(),
    open_graph_description: z.string().nullable().optional(),
    open_graph_use_meta_description: z.boolean().nullable().optional(),
    open_graph_use_product_name: z.boolean().nullable().optional(),
    open_graph_use_image: z.boolean().nullable().optional()
});

const ProviderResponseSchema = z.object({
    data: ProviderProductSchema,
    meta: z.record(z.string(), z.unknown())
});

const OutputSchema = ProviderProductSchema.passthrough();

const action = createAction({
    description: 'Retrieve a product.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['store_v2_products_read_only'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.bigcommerce.com/docs/rest-management/catalog/products#get-a-product
            endpoint: `/v3/catalog/products/${encodeURIComponent(String(input.product_id))}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Product not found',
                product_id: input.product_id
            });
        }

        const providerResponse = ProviderResponseSchema.parse(response.data);
        return providerResponse.data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
