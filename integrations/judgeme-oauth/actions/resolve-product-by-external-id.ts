import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        external_id: z.number().describe('The external platform product ID to resolve. Example: 10291926270247')
    })
    .describe('Input for resolving a product by its external platform ID.');

const ProviderProductSchema = z.object({
    id: z.number(),
    external_id: z.number(),
    title: z.string(),
    handle: z.string(),
    in_store: z.boolean().optional(),
    path: z.string().nullable().optional(),
    product_type: z.string().optional(),
    description: z.string().optional(),
    vendor: z.string().optional(),
    excluded: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
    mpns: z.string().nullable().optional(),
    barcodes: z.string().nullable().optional(),
    skus: z.string().nullable().optional(),
    lowest_price: z.string().optional(),
    highest_price: z.string().optional(),
    image_url: z.string().optional(),
    medium_image_url: z.string().optional(),
    small_image_url: z.string().optional()
});

const OutputSchema = z
    .object({
        id: z.number().describe('The internal Judge.me product ID.'),
        external_id: z.number().describe('The external platform product ID that was resolved.'),
        title: z.string().describe('The product title.'),
        handle: z.string().describe('The product handle.'),
        image_url: z.string().optional().describe('URL of the product image.')
    })
    .describe('The resolved Judge.me product.');

/**
 * @tags: [read]
 * @tagReason: Performs a single GET request to look up a product by external ID.
 */
const action = createAction({
    description: 'Resolve a platform product id to the internal Judge.me product id.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_products'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://judge.me/api/docs
            endpoint: 'api/v1/products/-1',
            params: {
                external_id: input.external_id
            },
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object' || !('product' in response.data)) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Product not found for the given external_id.',
                external_id: input.external_id
            });
        }

        const providerProduct = ProviderProductSchema.parse(response.data.product);

        return {
            id: providerProduct.id,
            external_id: providerProduct.external_id,
            title: providerProduct.title,
            handle: providerProduct.handle,
            ...(providerProduct.image_url != null && { image_url: providerProduct.image_url })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
