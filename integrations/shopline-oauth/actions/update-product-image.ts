import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        product_id: z.string().describe('The ID of the product that owns the image.'),
        image_id: z.string().describe('The ID of the product image to update.'),
        variant_id: z.string().optional().describe('The ID of the variant to associate with the image.'),
        sku_id: z.string().optional().describe('The ID of the SKU to associate with the image.'),
        alt: z.string().optional().describe('The alt text for the image.'),
        position: z.number().optional().describe('The display order of the image among the product images.')
    })
    .describe('Input for updating a product image.');

const ProviderImageResponseSchema = z.object({
    image: z.object({
        id: z.string(),
        product_id: z.string(),
        position: z.number().optional(),
        alt: z.string().optional(),
        width: z.number().optional(),
        height: z.number().optional(),
        src: z.string().optional(),
        variant_id: z.string().optional(),
        sku_id: z.string().nullable().optional()
    })
});

const OutputSchema = z
    .object({
        id: z.string().describe('The ID of the updated image.'),
        product_id: z.string().describe('The ID of the product that owns the image.'),
        position: z.number().optional().describe('The display order of the image.'),
        alt: z.string().optional().describe('The alt text for the image.'),
        src: z.string().optional().describe('The URL of the image.'),
        width: z.number().optional().describe('The width of the image in pixels.'),
        height: z.number().optional().describe('The height of the image in pixels.'),
        variant_id: z.string().optional().describe('The ID of the variant associated with the image.'),
        sku_id: z.string().optional().describe('The ID of the SKU associated with the image.')
    })
    .describe('The updated product image returned by the provider.');

/**
 * @tags: [write]
 * @tagReason: Updates an existing product image via a PUT request to the provider.
 * @pitfalls: There is no standalone call to list all images for a product; read the embedded `images` or `media` array from the product object to discover image IDs.
 */
const action = createAction({
    description: "Update a product image's metadata (alt text, position, variant association).",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['products'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://developer.shopline.com/docs/admin-rest-api/v20260601/product/image/update-a-product-image
            endpoint: `/admin/openapi/v20260601/products/${encodeURIComponent(input.product_id)}/images/${encodeURIComponent(input.image_id)}.json`,
            data: {
                image: {
                    ...(input.variant_id !== undefined && { variant_id: input.variant_id }),
                    ...(input.sku_id !== undefined && { sku_id: input.sku_id }),
                    ...(input.alt !== undefined && { alt: input.alt }),
                    ...(input.position !== undefined && { position: input.position })
                }
            },
            retries: 3
        });

        const providerResponse = ProviderImageResponseSchema.parse(response.data);
        const providerImage = providerResponse.image;

        return {
            id: providerImage.id,
            product_id: providerImage.product_id,
            ...(providerImage.position !== undefined && { position: providerImage.position }),
            ...(providerImage.alt !== undefined && { alt: providerImage.alt }),
            ...(providerImage.src !== undefined && { src: providerImage.src }),
            ...(providerImage.width !== undefined && { width: providerImage.width }),
            ...(providerImage.height !== undefined && { height: providerImage.height }),
            ...(providerImage.variant_id !== undefined && providerImage.variant_id !== '' && { variant_id: providerImage.variant_id }),
            ...(providerImage.sku_id != null && { sku_id: providerImage.sku_id })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
