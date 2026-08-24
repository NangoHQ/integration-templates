import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        cursor: z.string().optional().describe('Page number from the previous response. Omit for the first page.'),
        per_page: z.number().int().min(1).max(100).optional().describe('Number of items per page (max 100, default 10).')
    })
    .describe('Input for listing Judge.me products.');

const ProductSchema = z.object({
    id: z.number().describe('Judge.me product ID.'),
    external_id: z.number().describe('Shopify product ID.'),
    title: z.string().describe('Product title.'),
    handle: z.string().describe('Product handle.'),
    in_store: z.boolean().describe('Whether the product is available in the store.'),
    product_type: z.string().optional().describe('Product type.'),
    description: z.string().optional().describe('Product description.'),
    vendor: z.string().optional().describe('Product vendor.'),
    excluded: z.boolean().optional().describe('Whether the product is excluded from Judge.me.'),
    tags: z.array(z.string()).optional().describe('Product tags.'),
    lowest_price: z.string().optional().describe('Lowest product price.'),
    highest_price: z.string().optional().describe('Highest product price.'),
    image_url: z.string().optional().describe('Product image URL.'),
    medium_image_url: z.string().optional().describe('Medium product image URL.'),
    small_image_url: z.string().optional().describe('Small product image URL.')
});

const OutputSchema = z
    .object({
        products: z.array(ProductSchema).describe('List of products known to Judge.me for this shop.'),
        next_cursor: z.string().optional().describe('Cursor for the next page. Omit when there are no more pages.')
    })
    .describe('Output of the list-products action.');

const ProviderProductSchema = z.object({
    id: z.number(),
    external_id: z.number(),
    title: z.string(),
    handle: z.string(),
    in_store: z.boolean(),
    product_type: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    vendor: z.string().optional().nullable(),
    excluded: z.boolean().optional().nullable(),
    tags: z.array(z.string()).optional().nullable(),
    lowest_price: z.string().optional().nullable(),
    highest_price: z.string().optional().nullable(),
    image_url: z.string().optional().nullable(),
    medium_image_url: z.string().optional().nullable(),
    small_image_url: z.string().optional().nullable()
});

const ProviderResponseSchema = z.object({
    current_page: z.number(),
    per_page: z.number(),
    products: z.array(ProviderProductSchema)
});

/**
 * @tags: [read]
 * @tagReason: Reads the list of products from Judge.me.
 * @pitfalls: lowest_price and highest_price are returned as decimal strings rather than numbers. Products do not include updated_at or created_at, so incremental filtering by modification time is not supported.
 */
const action = createAction({
    description: 'List products known to Judge.me for this shop.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_products'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const page = input.cursor ? Number(input.cursor) : 1;
        if (!Number.isInteger(page) || page < 1) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'cursor must be a positive integer string.'
            });
        }

        const response = await nango.get({
            // https://judge.me/api/docs
            endpoint: '/api/v1/products',
            params: {
                page: String(page),
                ...(input.per_page !== undefined && { per_page: String(input.per_page) })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const products = providerResponse.products.map((item) => ({
            id: item.id,
            external_id: item.external_id,
            title: item.title,
            handle: item.handle,
            in_store: item.in_store,
            ...(item.product_type != null && { product_type: item.product_type }),
            ...(item.description != null && { description: item.description }),
            ...(item.vendor != null && { vendor: item.vendor }),
            ...(item.excluded != null && { excluded: item.excluded }),
            ...(item.tags != null && { tags: item.tags }),
            ...(item.lowest_price != null && { lowest_price: item.lowest_price }),
            ...(item.highest_price != null && { highest_price: item.highest_price }),
            ...(item.image_url != null && { image_url: item.image_url }),
            ...(item.medium_image_url != null && { medium_image_url: item.medium_image_url }),
            ...(item.small_image_url != null && { small_image_url: item.small_image_url })
        }));

        const next_cursor = products.length > 0 && products.length === providerResponse.per_page ? String(page + 1) : undefined;

        return {
            products,
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
