import { createAction } from 'nango';
import { z } from 'zod';

const imageSchema = z.object({
    id: z.string().describe('The unique identifier of the product image.'),
    src: z.string().describe('The URL of the image file.'),
    alt: z.string().describe('The alternative text for the image.'),
    position: z.number().describe('The display order of the image within the product.'),
    width: z.number().describe('The width of the image in pixels.'),
    height: z.number().describe('The height of the image in pixels.'),
    product_id: z.string().describe('The unique identifier of the product this image belongs to.'),
    create_time: z.string().describe('The ISO 8601 timestamp when the image was created.'),
    update_time: z.string().describe('The ISO 8601 timestamp when the image was last updated.')
});

const inputSchema = z
    .object({
        product_id: z.string().describe('The unique identifier of the product that owns the image.'),
        image_id: z.string().describe('The unique identifier of the image to retrieve.')
    })
    .describe('Input required to retrieve a single product image by ID.');

const outputSchema = z
    .object({
        image: imageSchema.describe('The requested product image.')
    })
    .describe('The response object containing a single product image.');

/**
 * @tags: [read]
 * @tagReason: Retrieves a single product image from the provider API by its ID.
 */
const getProductImage = createAction({
    description: 'Retrieve a single product image by ID.',
    version: '1.0.0',
    input: inputSchema,
    output: outputSchema,

    exec: async (nango, input) => {
        // https://developer.shopline.com/docs/admin-rest-api/v20260601/product/product-image/get-product-image
        const response = await nango.get({
            endpoint: `/admin/openapi/v20260601/products/${encodeURIComponent(input.product_id)}/images/${encodeURIComponent(input.image_id)}.json`,
            retries: 3
        });

        const providerImageSchema = z.object({
            image: z.object({
                id: z.string(),
                src: z.string(),
                alt: z.string(),
                position: z.number(),
                width: z.number(),
                height: z.number(),
                product_id: z.string(),
                create_time: z.string(),
                update_time: z.string()
            })
        });

        const parsed = providerImageSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new Error(`Invalid response from provider: ${parsed.error.message}`);
        }

        return parsed.data;
    }
});

export default getProductImage;
