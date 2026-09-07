import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        product_id: z.string().describe('The unique identifier of the product to attach the image to. Example: "16076831074833682966241755"'),
        src: z.string().max(255).describe('The URL of the image to attach. Max 255 characters. No base64 upload support.'),
        variant_id: z.string().optional().describe('The unique identifier of the variant to associate with the image.'),
        alt: z.string().optional().describe('Alternative text for the image, used for accessibility and SEO.')
    })
    .describe('Input to create a product image from a URL');

const ProviderImageSchema = z.object({
    id: z.string(),
    product_id: z.string(),
    src: z.string(),
    variant_id: z.string().optional().nullable(),
    alt: z.string().optional().nullable()
});

const OutputSchema = z
    .object({
        id: z.string().describe('The unique identifier of the created image.'),
        product_id: z.string().describe('The product identifier the image is attached to.'),
        src: z.string().describe('The URL of the image.'),
        variant_id: z.string().optional().describe('The variant identifier associated with the image, if any.'),
        alt: z.string().optional().describe('The alternative text for the image.')
    })
    .describe('Output of the created product image');

/**
 * @tags: [write]
 * @tagReason: Creates a new image resource on the provider and attaches it to a product.
 * @pitfalls: The provider returns empty strings for unset optional fields such as variant_id and alt rather than omitting them or returning null.
 */
const action = createAction({
    description: 'Add an image to a product from a URL',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['products'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.shopline.com/docs/admin-rest-api/v20260601/product/product-image/create-product-image
            endpoint: `/admin/openapi/v20260601/products/${encodeURIComponent(input.product_id)}/images.json`,
            data: {
                image: {
                    src: input.src,
                    ...(input.variant_id !== undefined && { variant_id: input.variant_id }),
                    ...(input.alt !== undefined && { alt: input.alt })
                }
            },
            retries: 3
        });

        const providerImage = z.object({ image: ProviderImageSchema }).parse(response.data);

        return {
            id: providerImage.image.id,
            product_id: providerImage.image.product_id,
            src: providerImage.image.src,
            ...(providerImage.image.variant_id != null && { variant_id: providerImage.image.variant_id }),
            ...(providerImage.image.alt != null && { alt: providerImage.image.alt })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
