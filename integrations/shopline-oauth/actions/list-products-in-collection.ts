import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        collection_id: z.string().describe('Collection ID to list products for.'),
        fields: z.string().optional().describe('Comma-separated list of fields to include in the response.'),
        limit: z.number().int().min(1).max(250).optional().describe('Maximum number of products per page (1-250).'),
        cursor: z.string().optional().describe('Pagination cursor (page_info) from the previous response.')
    })
    .describe('Input parameters for listing products in a collection.');

const ProductSchema = z
    .object({
        id: z.string().describe('Unique product ID.'),
        title: z.string().describe('Product title.'),
        handle: z.string().optional().describe('Product handle.'),
        status: z.string().optional().describe('Product status, e.g., active or draft.'),
        variants: z
            .array(
                z
                    .object({
                        id: z.string().optional().describe('Variant ID.'),
                        title: z.string().optional().describe('Variant title.'),
                        sku: z.string().optional().describe('Stock keeping unit.'),
                        price: z.string().optional().describe('Variant price.'),
                        inventory_item_id: z.string().optional().describe('Inventory item ID.')
                    })
                    .passthrough()
            )
            .optional()
            .describe('Product variants.'),
        images: z
            .array(
                z
                    .object({
                        id: z.string().optional().describe('Image ID.'),
                        src: z.string().optional().describe('Image URL.')
                    })
                    .passthrough()
            )
            .optional()
            .describe('Product images.'),
        options: z
            .array(
                z
                    .object({
                        name: z.string().describe('Option name, e.g., Color.'),
                        values: z.array(z.string()).describe('Option values.')
                    })
                    .passthrough()
            )
            .optional()
            .describe('Product options.')
    })
    .passthrough();

const OutputSchema = z
    .object({
        products: z.array(ProductSchema).describe('Products belonging to the collection.'),
        next_page_info: z.string().optional().describe('Pagination cursor for the next page.')
    })
    .describe('Output containing products in a collection and optional pagination cursor.');

/**
 * @tags: [read]
 * @tagReason: Reads products belonging to a collection from the provider.
 * @pitfalls: Product images in the response may omit id fields, limiting subsequent image-specific operations.
 */
const action = createAction({
    description: 'List products belonging to a collection (manual or smart).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.shopline.com/docs/admin-rest-api/v20260601/products/collections/list-products-in-collection
        const response = await nango.get({
            endpoint: `/admin/openapi/v20260601/products/collections/${encodeURIComponent(input.collection_id)}/products.json`,
            params: {
                ...(input.fields && { fields: input.fields }),
                ...(input.limit !== undefined && { limit: String(input.limit) }),
                ...(input.cursor && { page_info: input.cursor })
            },
            retries: 3
        });

        const ProviderResponseSchema = z.object({
            products: z.array(z.unknown())
        });
        const data = ProviderResponseSchema.parse(response.data);

        const products = data.products.map((item) => ProductSchema.parse(item));

        const linkHeader = response.headers?.['link'] || response.headers?.['Link'];
        let nextPageInfo: string | undefined;
        if (typeof linkHeader === 'string') {
            const nextMatch = linkHeader.match(/<[^>]*[?&]page_info=([^&>]+)[^>]*>;\s*rel="next"/);
            if (nextMatch?.[1]) {
                nextPageInfo = decodeURIComponent(nextMatch[1]);
            }
        }

        return {
            products,
            ...(nextPageInfo !== undefined && { next_page_info: nextPageInfo })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
