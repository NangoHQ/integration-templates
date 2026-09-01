import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.number().int().positive().describe('Judge.me internal product id. Example: 2117026531')
    })
    .describe('Input for fetching a single Judge.me product by its internal id');

const ProviderProductSchema = z.object({
    id: z.number(),
    external_id: z.number().nullable(),
    title: z.string(),
    handle: z.string(),
    in_store: z.boolean(),
    path: z.string().nullable(),
    product_type: z.string(),
    description: z.string(),
    vendor: z.string(),
    excluded: z.boolean(),
    tags: z.array(z.string()),
    mpns: z.string().nullable(),
    barcodes: z.string().nullable(),
    skus: z.array(z.string()).nullable(),
    lowest_price: z.string().nullable(),
    highest_price: z.string().nullable(),
    image_url: z.string().nullable(),
    medium_image_url: z.string().nullable(),
    small_image_url: z.string().nullable()
});

const OutputSchema = z
    .object({
        id: z.number().describe('Judge.me internal product id'),
        external_id: z.number().optional().describe('Shopify external product id'),
        title: z.string().describe('Product title'),
        handle: z.string().describe('Product handle'),
        in_store: z.boolean().describe('Whether the product is available in the store'),
        path: z.string().optional().describe('Product path'),
        product_type: z.string().describe('Product type'),
        description: z.string().describe('Product description'),
        vendor: z.string().describe('Product vendor'),
        excluded: z.boolean().describe('Whether the product is excluded from Judge.me'),
        tags: z.array(z.string()).describe('Product tags'),
        mpns: z.string().optional().describe('Manufacturer part numbers'),
        barcodes: z.string().optional().describe('Product barcodes'),
        skus: z.array(z.string()).optional().describe('Product SKUs'),
        lowest_price: z.string().optional().describe('Lowest product price'),
        highest_price: z.string().optional().describe('Highest product price'),
        image_url: z.string().optional().describe('Full-size product image URL'),
        medium_image_url: z.string().optional().describe('Medium product image URL'),
        small_image_url: z.string().optional().describe('Small product image URL')
    })
    .describe('A single Judge.me product');

/**
 * @tags: [read]
 * @tagReason: Reads a single product from the Judge.me API.
 * @pitfalls: The id must be the Judge.me internal product id, not the Shopify external_id. Lowest and highest price fields are returned as strings rather than numbers.
 */
const action = createAction({
    description: 'Fetch a single product by its Judge.me product id',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_products'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://judge.me/api/docs
            endpoint: `/api/v1/products/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (!response.data || !response.data.product) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Product not found',
                id: input.id
            });
        }

        const providerProduct = ProviderProductSchema.parse(response.data.product);

        return {
            id: providerProduct.id,
            ...(providerProduct.external_id != null && { external_id: providerProduct.external_id }),
            title: providerProduct.title,
            handle: providerProduct.handle,
            in_store: providerProduct.in_store,
            ...(providerProduct.path != null && { path: providerProduct.path }),
            product_type: providerProduct.product_type,
            description: providerProduct.description,
            vendor: providerProduct.vendor,
            excluded: providerProduct.excluded,
            tags: providerProduct.tags,
            ...(providerProduct.mpns != null && { mpns: providerProduct.mpns }),
            ...(providerProduct.barcodes != null && { barcodes: providerProduct.barcodes }),
            ...(providerProduct.skus != null && { skus: providerProduct.skus }),
            ...(providerProduct.lowest_price != null && { lowest_price: providerProduct.lowest_price }),
            ...(providerProduct.highest_price != null && { highest_price: providerProduct.highest_price }),
            ...(providerProduct.image_url != null && { image_url: providerProduct.image_url }),
            ...(providerProduct.medium_image_url != null && { medium_image_url: providerProduct.medium_image_url }),
            ...(providerProduct.small_image_url != null && { small_image_url: providerProduct.small_image_url })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
