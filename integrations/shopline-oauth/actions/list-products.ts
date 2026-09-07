import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        limit: z.number().min(1).max(50).optional().describe('Number of products to return per page (1-50, default 50).'),
        page_info: z.string().optional().describe('Pagination cursor from the previous response link header. Omit for the first page.'),
        since_id: z.string().optional().describe('Restrict results to products with an ID greater than this value.'),
        created_at_min: z.string().optional().describe('Minimum creation date in ISO 8601 format (e.g. 2024-01-01T00:00:00Z).'),
        created_at_max: z.string().optional().describe('Maximum creation date in ISO 8601 format.'),
        updated_at_min: z.string().optional().describe('Minimum update date in ISO 8601 format. Only returns products updated after this time.'),
        updated_at_max: z.string().optional().describe('Maximum update date in ISO 8601 format.'),
        status: z.enum(['active', 'draft', 'archived']).optional().describe('Filter by product status.'),
        title: z.string().optional().describe('Filter by product title (partial match supported by provider).'),
        handle: z.string().optional().describe('Filter by product handle (URL-friendly identifier).'),
        vendor: z.string().optional().describe('Filter by product vendor name.'),
        collection_id: z.string().optional().describe('Filter by the ID of a custom or smart collection the product belongs to.'),
        product_category: z.string().optional().describe('Filter by product category identifier.'),
        ids: z.string().optional().describe('Comma-separated list of product IDs to return.'),
        order_by: z.string().optional().describe('Sort order for results (e.g. created_at DESC, updated_at ASC).'),
        fields: z.string().optional().describe('Comma-separated list of fields to return (field subsetting).')
    })
    .describe('Input parameters for listing products with filtering and pagination.');

const ProductVariantSchema = z
    .object({
        id: z.string().optional().describe('Unique identifier for the variant.'),
        product_id: z.string().optional().describe('Identifier of the parent product.'),
        title: z.string().nullable().optional().describe('Display title of the variant, combining option values.'),
        price: z.string().optional().describe('Price of the variant.'),
        sku: z.string().nullable().optional().describe('Stock keeping unit for inventory tracking.'),
        position: z.number().optional().describe('Display order of the variant within the product.'),
        inventory_policy: z.string().optional().describe('Behavior when inventory is exhausted, e.g. deny or continue.'),
        compare_at_price: z.string().nullable().optional().describe('Original price shown for comparison.'),
        fulfillment_service: z.string().optional().describe('Service responsible for fulfilling the variant.'),
        inventory_management: z.string().optional().describe('System tracking inventory for this variant.'),
        option1: z.string().nullable().optional().describe('First option value for the variant.'),
        option2: z.string().nullable().optional().describe('Second option value for the variant.'),
        option3: z.string().nullable().optional().describe('Third option value for the variant.'),
        created_at: z.string().optional().describe('Creation timestamp in ISO 8601 format.'),
        updated_at: z.string().optional().describe('Last update timestamp in ISO 8601 format.'),
        taxable: z.boolean().optional().describe('Whether the variant is subject to taxes.'),
        barcode: z.string().nullable().optional().describe('Barcode or ISBN identifier.'),
        grams: z.union([z.number(), z.string(), z.null()]).optional().describe('Weight of the variant in grams.'),
        weight: z.union([z.number(), z.string(), z.null()]).optional().describe('Weight of the variant in the unit specified by weight_unit.'),
        weight_unit: z.string().nullable().optional().describe('Unit of weight, e.g. g or kg.'),
        inventory_item_id: z.string().optional().describe('Identifier of the linked inventory item.'),
        inventory_quantity: z.number().optional().describe('Available inventory quantity.'),
        old_inventory_quantity: z.number().optional().describe('Previous inventory quantity before the last change.'),
        requires_shipping: z.boolean().optional().describe('Whether the variant requires physical shipping.'),
        admin_graphql_api_id: z.string().optional().describe('GraphQL API identifier for the variant.')
    })
    .passthrough();

const ProductOptionSchema = z
    .object({
        id: z.string().optional().describe('Unique identifier for the option.'),
        product_id: z.string().optional().describe('Identifier of the parent product.'),
        name: z.string().optional().describe('Name of the option, e.g. Color or Size.'),
        position: z.number().optional().describe('Display order of the option.'),
        values: z.array(z.string()).optional().describe('List of possible values for this option.')
    })
    .passthrough();

const ProductImageSchema = z
    .object({
        id: z.string().optional().describe('Unique identifier for the image.'),
        product_id: z.string().optional().describe('Identifier of the parent product.'),
        position: z.number().optional().describe('Display order of the image.'),
        created_at: z.string().optional().describe('Creation timestamp in ISO 8601 format.'),
        updated_at: z.string().optional().describe('Last update timestamp in ISO 8601 format.'),
        src: z.string().optional().describe('URL of the image file.'),
        width: z.number().optional().describe('Width of the image in pixels.'),
        height: z.number().optional().describe('Height of the image in pixels.'),
        alt: z.string().nullable().optional().describe('Alternative text for accessibility.'),
        admin_graphql_api_id: z.string().optional().describe('GraphQL API identifier for the image.')
    })
    .passthrough();

const ProductMediaSchema = z
    .object({
        id: z.string().optional().describe('Unique identifier for the media item.'),
        product_id: z.string().optional().describe('Identifier of the parent product.'),
        position: z.number().optional().describe('Display order of the media item.'),
        created_at: z.string().optional().describe('Creation timestamp in ISO 8601 format.'),
        updated_at: z.string().optional().describe('Last update timestamp in ISO 8601 format.'),
        src: z.string().optional().describe('URL of the media file.'),
        width: z.number().optional().describe('Width of the media in pixels.'),
        height: z.number().optional().describe('Height of the media in pixels.'),
        alt: z.string().nullable().optional().describe('Alternative text for accessibility.'),
        media_type: z.string().optional().describe('Type of media, e.g. IMAGE.'),
        admin_graphql_api_id: z.string().optional().describe('GraphQL API identifier for the media.')
    })
    .passthrough();

const ProductSchema = z
    .object({
        id: z.string().optional().describe('Unique identifier for the product.'),
        title: z.string().optional().describe('Title of the product.'),
        body_html: z.string().nullable().optional().describe('HTML description of the product.'),
        vendor: z.string().nullable().optional().describe('Vendor or brand name.'),
        product_type: z.string().optional().describe('Classification type of the product.'),
        created_at: z.string().optional().describe('Creation timestamp in ISO 8601 format.'),
        handle: z.string().optional().describe('URL-friendly identifier for the product.'),
        updated_at: z.string().optional().describe('Last update timestamp in ISO 8601 format.'),
        published_at: z.string().nullable().optional().describe('Publication timestamp, null if not published.'),
        published_scope: z.string().nullable().optional().describe('Channels where the product is published.'),
        tags: z.string().nullable().optional().describe('Comma-separated list of tags.'),
        variants: z.array(ProductVariantSchema).optional().describe('Variants of the product with distinct option combinations.'),
        options: z.array(ProductOptionSchema).optional().describe('Option definitions available for the product.'),
        images: z.array(ProductImageSchema).optional().describe('Images associated with the product.'),
        media: z.array(ProductMediaSchema).optional().describe('Media items including images and videos.'),
        image: ProductImageSchema.nullable().optional().describe('Primary image of the product.'),
        template_suffix: z.string().nullable().optional().describe('Custom template suffix for the product page.'),
        admin_graphql_api_id: z.string().optional().describe('GraphQL API identifier for the product.'),
        status: z.string().optional().describe('Current status: active, draft, or archived.'),
        variants_count: z.number().optional().describe('Total number of variants for the product.'),
        options_count: z.number().optional().describe('Total number of options for the product.'),
        metafields: z.unknown().optional().describe('Custom metafield data attached to the product.')
    })
    .passthrough();

const OutputSchema = z
    .object({
        products: z.array(ProductSchema).describe('Array of product objects matching the filters.'),
        next_page_info: z.string().optional().describe('Pagination cursor to fetch the next page. Absent when there are no more results.')
    })
    .describe('Output of the list products action, including the product list and optional next-page cursor.');

/**
 * @tags: [read]
 * @tagReason: Reads product data from the SHOPLINE Admin REST API. No provider-side mutations occur.
 * @pitfalls: Product and variant string fields can be null instead of empty strings, and variant weight is returned as a string rather than a number.
 */
const action = createAction({
    description: 'List products with filtering and pagination.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_products'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {};
        if (input.limit !== undefined) {
            params['limit'] = input.limit;
        }
        if (input.page_info !== undefined) {
            params['page_info'] = input.page_info;
        }
        if (input.since_id !== undefined) {
            params['since_id'] = input.since_id;
        }
        if (input.created_at_min !== undefined) {
            params['created_at_min'] = input.created_at_min;
        }
        if (input.created_at_max !== undefined) {
            params['created_at_max'] = input.created_at_max;
        }
        if (input.updated_at_min !== undefined) {
            params['updated_at_min'] = input.updated_at_min;
        }
        if (input.updated_at_max !== undefined) {
            params['updated_at_max'] = input.updated_at_max;
        }
        if (input.status !== undefined) {
            params['status'] = input.status;
        }
        if (input.title !== undefined) {
            params['title'] = input.title;
        }
        if (input.handle !== undefined) {
            params['handle'] = input.handle;
        }
        if (input.vendor !== undefined) {
            params['vendor'] = input.vendor;
        }
        if (input.collection_id !== undefined) {
            params['collection_id'] = input.collection_id;
        }
        if (input.product_category !== undefined) {
            params['product_category'] = input.product_category;
        }
        if (input.ids !== undefined) {
            params['ids'] = input.ids;
        }
        if (input.order_by !== undefined) {
            params['order_by'] = input.order_by;
        }
        if (input.fields !== undefined) {
            params['fields'] = input.fields;
        }

        // https://developer.shopline.com/docs/admin-rest-api/v20260601/product/products/list-products
        const response = await nango.get({
            endpoint: '/admin/openapi/v20260601/products/products.json',
            params,
            retries: 3
        });

        const linkHeader = response.headers?.['link'] ?? response.headers?.['Link'];
        let nextPageInfo: string | undefined;

        if (typeof linkHeader === 'string') {
            const nextMatch = linkHeader.match(/<[^>]*[?&]page_info=([^&>]+)[^>]*>;\s*rel="next"/);
            if (nextMatch && nextMatch[1]) {
                nextPageInfo = decodeURIComponent(nextMatch[1]);
            }
        }

        const parsed = z.object({ products: z.array(z.unknown()) }).parse(response.data);
        const products = parsed.products.map((item: unknown) => ProductSchema.parse(item));

        return {
            products,
            ...(nextPageInfo !== undefined && { next_page_info: nextPageInfo })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
