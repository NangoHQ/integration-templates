import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    product_id: z.number().describe('The ID of the Product to update. Example: 123'),
    name: z.string().optional(),
    sku: z.string().optional(),
    description: z.string().optional(),
    price: z.number().optional(),
    sale_price: z.number().optional(),
    cost_price: z.number().optional(),
    retail_price: z.number().optional(),
    map_price: z.number().optional(),
    weight: z.number().optional(),
    width: z.number().optional(),
    depth: z.number().optional(),
    height: z.number().optional(),
    categories: z.array(z.number()).optional(),
    brand_id: z.number().optional(),
    brand_name: z.string().optional(),
    inventory_level: z.number().optional(),
    inventory_warning_level: z.number().optional(),
    inventory_tracking: z.enum(['none', 'product', 'variant']).optional(),
    is_visible: z.boolean().optional(),
    is_featured: z.boolean().optional(),
    is_free_shipping: z.boolean().optional(),
    availability: z.enum(['available', 'disabled', 'preorder']).optional(),
    condition: z.enum(['New', 'Used', 'Refurbished']).optional(),
    is_condition_shown: z.boolean().optional(),
    order_quantity_minimum: z.number().optional(),
    order_quantity_maximum: z.number().optional(),
    page_title: z.string().optional(),
    meta_description: z.string().optional(),
    meta_keywords: z.array(z.string()).optional(),
    search_keywords: z.string().optional(),
    upc: z.string().optional(),
    mpn: z.string().optional(),
    gtin: z.string().optional(),
    tax_class_id: z.number().optional(),
    product_tax_code: z.string().optional(),
    fixed_cost_shipping_price: z.number().optional(),
    warranty: z.string().optional(),
    bin_picking_number: z.string().optional(),
    layout_file: z.string().optional(),
    availability_description: z.string().optional(),
    sort_order: z.number().optional(),
    preorder_release_date: z.string().nullable().optional(),
    preorder_message: z.string().optional(),
    is_preorder_only: z.boolean().optional(),
    is_price_hidden: z.boolean().optional(),
    price_hidden_label: z.string().optional(),
    open_graph_type: z.enum(['product', 'album', 'book', 'drink', 'food', 'game', 'movie', 'song', 'tv_show']).optional(),
    open_graph_title: z.string().optional(),
    open_graph_description: z.string().optional(),
    open_graph_use_meta_description: z.boolean().optional(),
    open_graph_use_product_name: z.boolean().optional(),
    open_graph_use_image: z.boolean().optional(),
    type: z.enum(['physical', 'digital']).optional(),
    custom_url: z
        .object({
            url: z.string().optional(),
            is_customized: z.boolean().optional(),
            create_redirect: z.boolean().optional()
        })
        .optional(),
    related_products: z.array(z.number()).optional(),
    gift_wrapping_options_type: z.enum(['any', 'none', 'list']).optional(),
    gift_wrapping_options_list: z.array(z.number()).optional(),
    custom_fields: z
        .array(
            z.object({
                id: z.number().optional(),
                name: z.string(),
                value: z.string()
            })
        )
        .optional(),
    bulk_pricing_rules: z
        .array(
            z.object({
                id: z.number().optional(),
                quantity_min: z.number(),
                quantity_max: z.number(),
                type: z.enum(['price', 'percent', 'fixed']),
                amount: z.union([z.number(), z.string()])
            })
        )
        .optional(),
    images: z
        .array(
            z.object({
                image_url: z.string().optional(),
                is_thumbnail: z.boolean().optional(),
                sort_order: z.number().optional(),
                description: z.string().optional()
            })
        )
        .optional(),
    videos: z
        .array(
            z.object({
                title: z.string().optional(),
                description: z.string().optional(),
                sort_order: z.number().optional(),
                type: z.literal('youtube').optional(),
                video_id: z.string().optional()
            })
        )
        .optional()
});

const ProviderProductSchema = z
    .object({
        id: z.number().describe('ID of the product. Example: 123'),
        name: z.string().optional(),
        sku: z.string().optional(),
        description: z.string().optional(),
        price: z.number().optional(),
        sale_price: z.number().optional(),
        cost_price: z.number().optional(),
        retail_price: z.number().optional(),
        map_price: z.number().optional(),
        weight: z.number().optional(),
        width: z.number().optional(),
        depth: z.number().optional(),
        height: z.number().optional(),
        categories: z.array(z.number()).optional(),
        brand_id: z.number().optional(),
        inventory_level: z.number().optional(),
        inventory_warning_level: z.number().optional(),
        inventory_tracking: z.string().optional(),
        is_visible: z.boolean().optional(),
        is_featured: z.boolean().optional(),
        is_free_shipping: z.boolean().optional(),
        availability: z.string().optional(),
        condition: z.string().optional(),
        is_condition_shown: z.boolean().optional(),
        order_quantity_minimum: z.number().optional(),
        order_quantity_maximum: z.number().optional(),
        page_title: z.string().optional(),
        meta_description: z.string().optional(),
        meta_keywords: z.array(z.string()).optional(),
        search_keywords: z.string().optional(),
        upc: z.string().optional(),
        mpn: z.string().optional(),
        gtin: z.string().optional(),
        tax_class_id: z.number().optional(),
        product_tax_code: z.string().optional(),
        fixed_cost_shipping_price: z.number().optional(),
        warranty: z.string().optional(),
        bin_picking_number: z.string().optional(),
        layout_file: z.string().optional(),
        availability_description: z.string().optional(),
        sort_order: z.number().optional(),
        preorder_release_date: z.string().nullable().optional(),
        preorder_message: z.string().optional(),
        is_preorder_only: z.boolean().optional(),
        is_price_hidden: z.boolean().optional(),
        price_hidden_label: z.string().optional(),
        type: z.string().optional(),
        custom_url: z.object({}).passthrough().optional(),
        related_products: z.array(z.number()).optional(),
        gift_wrapping_options_type: z.string().optional(),
        gift_wrapping_options_list: z.array(z.number()).optional(),
        custom_fields: z.array(z.object({}).passthrough()).optional(),
        bulk_pricing_rules: z.array(z.object({}).passthrough()).optional(),
        images: z.array(z.object({}).passthrough()).optional(),
        videos: z.array(z.object({}).passthrough()).optional(),
        date_created: z.string().optional(),
        date_modified: z.string().optional(),
        calculated_price: z.number().optional(),
        base_variant_id: z.number().nullable().optional(),
        primary_image: z.object({}).passthrough().optional(),
        reviews_rating_sum: z.number().optional(),
        reviews_count: z.number().optional(),
        total_sold: z.number().optional(),
        view_count: z.number().optional()
    })
    .passthrough();

const OutputSchema = ProviderProductSchema;

const action = createAction({
    description: 'Update a product.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['store_v2_products'],
    endpoint: {
        path: '/actions/update-product',
        method: 'POST'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const payload: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(input)) {
            if (key !== 'product_id' && value !== undefined) {
                payload[key] = value;
            }
        }

        let response: Awaited<ReturnType<typeof nango.put>>;
        try {
            response = await nango.put({
                // https://developer.bigcommerce.com/docs/rest-management/catalog/products#update-a-product
                endpoint: `/v3/catalog/products/${encodeURIComponent(String(input['product_id']))}`,
                data: payload,
                retries: 3
            });
        } catch (err: unknown) {
            if (typeof err === 'object' && err !== null && 'response' in err) {
                const response = err.response;
                if (typeof response === 'object' && response !== null && 'status' in response) {
                    if (response.status === 404) {
                        throw new nango.ActionError({
                            type: 'not_found',
                            message: `Product with ID ${input['product_id']} not found.`,
                            product_id: input['product_id']
                        });
                    }
                    if (response.status === 409) {
                        throw new nango.ActionError({
                            type: 'conflict',
                            message:
                                'Product update conflict. This may be caused by duplicate unique values, missing associations, or conflicting bulk pricing rules.',
                            product_id: input['product_id']
                        });
                    }
                    if (response.status === 422) {
                        throw new nango.ActionError({
                            type: 'validation_error',
                            message: 'Product update failed validation. The request may contain missing required fields or invalid data.',
                            product_id: input['product_id']
                        });
                    }
                }
            }
            throw err;
        }

        const responseBody = z
            .object({
                data: z.unknown()
            })
            .parse(response.data);

        const product = ProviderProductSchema.parse(responseBody.data);
        return product;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
