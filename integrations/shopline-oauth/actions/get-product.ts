import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        product_id: z.string().describe('The unique identifier of the product to retrieve. Example: "16076831074833682966241755"'),
        fields: z.string().optional().describe('Comma-separated list of fields to include in the response. Omit to return all fields.')
    })
    .describe('Input parameters for retrieving a single product by ID.');

const ProductOptionSchema = z
    .object({
        name: z.string().optional().describe('The display name of the option, e.g. "Color".'),
        position: z.number().optional().describe('The 1-based position of the option in the list.'),
        values: z.array(z.string()).optional().describe('The possible values for this option, e.g. ["Yellow", "Pink"].')
    })
    .describe('A product option such as Color or Size.');

const ProductVariantSchema = z
    .object({
        id: z.string().optional().describe('The unique identifier of the variant.'),
        title: z.string().optional().describe('The display title of the variant, e.g. "Yellow · S".'),
        price: z.string().optional().describe('The price of the variant as a decimal string.'),
        sku: z.string().optional().describe('The stock keeping unit identifier.'),
        inventory_quantity: z.number().optional().describe('The available inventory quantity for this variant.'),
        inventory_item_id: z.string().optional().describe('The inventory item ID used for inventory tracking.'),
        option1: z.string().optional().nullable().describe('The value for the first product option.'),
        option2: z.string().optional().nullable().describe('The value for the second product option.'),
        option3: z.string().optional().nullable().describe('The value for the third product option.'),
        option4: z.string().optional().nullable().describe('The value for the fourth product option.'),
        option5: z.string().optional().nullable().describe('The value for the fifth product option.'),
        created_at: z.string().optional().describe('ISO 8601 timestamp when the variant was created.'),
        updated_at: z.string().optional().describe('ISO 8601 timestamp when the variant was last updated.'),
        weight: z.string().optional().nullable().describe('The weight of the variant as a decimal string.'),
        weight_unit: z.string().optional().nullable().describe('The unit of weight, e.g. "g" or "kg".')
    })
    .describe('A product variant representing a specific SKU.');

const ProductImageSchema = z
    .object({
        id: z.string().optional().describe('The unique identifier of the image.'),
        src: z.string().optional().nullable().describe('The public URL of the image.'),
        position: z.number().optional().describe('The 1-based display position of the image.'),
        created_at: z.string().optional().describe('ISO 8601 timestamp when the image was created.'),
        updated_at: z.string().optional().describe('ISO 8601 timestamp when the image was last updated.')
    })
    .describe('A product image.');

const ProductMediaSchema = z
    .object({
        id: z.string().optional().describe('The unique identifier of the media item.'),
        media_type: z.string().optional().describe('The type of media, e.g. "image" or "video".'),
        src: z.string().optional().nullable().describe('The public URL of the media source.'),
        preview_url: z.string().optional().nullable().describe('The preview URL for the media item.')
    })
    .describe('A product media item such as an image or video.');

const ProviderProductSchema = z.object({
    id: z.string(),
    title: z.string(),
    handle: z.string(),
    status: z.string(),
    tags: z.string().nullish(),
    body_html: z.string().nullish(),
    vendor: z.string().nullish(),
    product_type: z.string().nullish(),
    created_at: z.string().nullish(),
    updated_at: z.string().nullish(),
    published_at: z.string().nullish(),
    options: z.array(ProductOptionSchema).nullish(),
    variants: z.array(ProductVariantSchema).nullish(),
    images: z.array(ProductImageSchema).nullish(),
    media: z.array(ProductMediaSchema).nullish()
});

const OutputSchema = z
    .object({
        id: z.string().describe('The unique identifier of the product.'),
        title: z.string().describe('The product title.'),
        handle: z.string().describe('The URL-safe handle for the product.'),
        status: z.string().describe('The product status, e.g. "active" or "draft".'),
        tags: z.string().optional().describe('Comma-separated tags assigned to the product.'),
        body_html: z.string().optional().describe('The product description in HTML format.'),
        vendor: z.string().optional().describe('The vendor or brand name.'),
        product_type: z.string().optional().describe('The product category type.'),
        created_at: z.string().optional().describe('ISO 8601 timestamp when the product was created.'),
        updated_at: z.string().optional().describe('ISO 8601 timestamp when the product was last updated.'),
        published_at: z.string().optional().describe('ISO 8601 timestamp when the product was published.'),
        options: z.array(ProductOptionSchema).optional().describe('The product options available.'),
        variants: z.array(ProductVariantSchema).optional().describe('The product variants.'),
        images: z.array(ProductImageSchema).optional().describe('The product images.'),
        media: z.array(ProductMediaSchema).optional().describe('The product media items.')
    })
    .describe('A single SHOPLINE product with embedded variants, options, images, and media.');

/**
 * @tags: [read]
 * @tagReason: Retrieves an existing product by its ID without modifying provider data.
 * @pitfalls: The provider returns media items with `content_type` and `preview_image` fields, so `media_type` and `preview_url` are never populated in the output.
 */
const action = createAction({
    description: 'Retrieve a single product by ID.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_products'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.shopline.com/docs/admin-rest-api/v20260601/product/product/get-product
            endpoint: `/admin/openapi/v20260601/products/${encodeURIComponent(input.product_id)}.json`,
            params: {
                ...(input.fields !== undefined && { fields: input.fields })
            },
            retries: 3
        });

        const responseData = z.object({ product: z.unknown() }).parse(response.data);
        const providerProduct = ProviderProductSchema.parse(responseData.product);

        return {
            id: providerProduct.id,
            title: providerProduct.title,
            handle: providerProduct.handle,
            status: providerProduct.status,
            ...(providerProduct.tags != null && { tags: providerProduct.tags }),
            ...(providerProduct.body_html != null && { body_html: providerProduct.body_html }),
            ...(providerProduct.vendor != null && { vendor: providerProduct.vendor }),
            ...(providerProduct.product_type != null && { product_type: providerProduct.product_type }),
            ...(providerProduct.created_at != null && { created_at: providerProduct.created_at }),
            ...(providerProduct.updated_at != null && { updated_at: providerProduct.updated_at }),
            ...(providerProduct.published_at != null && { published_at: providerProduct.published_at }),
            ...(providerProduct.options != null && { options: providerProduct.options }),
            ...(providerProduct.variants != null && { variants: providerProduct.variants }),
            ...(providerProduct.images != null && { images: providerProduct.images }),
            ...(providerProduct.media != null && { media: providerProduct.media })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
