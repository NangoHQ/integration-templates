import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        product_id: z.string().describe('The unique identifier for the product whose images to list.'),
        ids: z
            .array(z.string())
            .describe('The image IDs to retrieve. The endpoint requires this parameter and does not support listing all images without explicit IDs.'),
        fields: z.string().optional().describe('Comma-separated list of fields to return in the response. Omit to receive all fields.')
    })
    .describe('Input parameters for listing product images by their IDs.');

const ProviderImageSchema = z
    .object({
        id: z.string(),
        product_id: z.string(),
        src: z.string(),
        alt: z.string().nullish(),
        position: z.number().nullish(),
        create_time: z.string().nullish(),
        update_time: z.string().nullish(),
        witdh: z.number().nullish(),
        height: z.number().nullish()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    images: z.array(ProviderImageSchema)
});

const ImageSchema = z.object({
    id: z.string().describe('The unique identifier for the product image.'),
    product_id: z.string().describe('The unique identifier for the product this image belongs to.'),
    src: z.string().describe('The URL of the image.'),
    alt: z.string().optional().describe('The alternative textual description of the image.'),
    position: z.number().optional().describe('The position of the image in the product gallery.'),
    create_time: z.string().optional().describe('The date and time when the image was created. Format: ISO 8601.'),
    update_time: z.string().optional().describe('The date and time when the image was last updated. Format: ISO 8601.'),
    width: z.number().optional().describe('The width of the image in pixels.'),
    height: z.number().optional().describe('The height of the image in pixels.')
});

const OutputSchema = z
    .object({
        images: z.array(ImageSchema).describe('The list of images matching the requested IDs.')
    })
    .describe('The list of product images returned for the requested IDs.');

/**
 * @tags: [read]
 * @tagReason: Retrieves product images by their IDs via a GET request.
 * @pitfalls: Requires known image IDs and cannot discover all images for a product; fetch the product object to access its full embedded images or media list instead.
 */
const action = createAction({
    description: 'List images for a product by image IDs.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_products'],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.shopline.com/docs/admin-rest-api/v20260601/product/product-image/get-product-images
            endpoint: `/admin/openapi/v20260601/products/${encodeURIComponent(input.product_id)}/images.json`,
            params: {
                ids: input.ids.join(','),
                ...(input.fields !== undefined && { fields: input.fields })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const images = providerResponse.images.map((img) => ({
            id: img.id,
            product_id: img.product_id,
            src: img.src,
            ...(img.alt != null && { alt: img.alt }),
            ...(img.position != null && { position: img.position }),
            ...(img.create_time != null && { create_time: img.create_time }),
            ...(img.update_time != null && { update_time: img.update_time }),
            ...(img.witdh != null && { width: img.witdh }),
            ...(img.height != null && { height: img.height })
        }));

        return {
            images
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
