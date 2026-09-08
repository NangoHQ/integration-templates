import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const ProductOptionInputSchema = z.object({
    name: z.string().describe('The name of the product option. Example: "Color"'),
    values: z.array(z.string()).describe('The possible values for this option. Example: ["Blue", "Red"]')
});

const ProductVariantInputSchema = z.object({
    option1: z.string().optional().describe('The value of the first product option.'),
    option2: z.string().optional().describe('The value of the second product option.'),
    option3: z.string().optional().describe('The value of the third product option.'),
    option4: z.string().optional().describe('The value of the fourth product option.'),
    option5: z.string().optional().describe('The value of the fifth product option.'),
    price: z.string().optional().describe('The price of the variant.'),
    sku: z.string().optional().describe('The SKU of the variant.'),
    inventory_quantity: z.number().optional().describe('The inventory quantity of the variant.')
});

const ProductMediaInputSchema = z.object({
    src: z.string().describe('The source URL of the media asset to attach.'),
    alt: z.string().optional().describe('The alt text for the media asset.')
});

const InputSchema = z
    .object({
        title: z.string().describe('The product title. Required for creation.'),
        status: z.enum(['active', 'draft', 'archived']).optional().describe('The status of the product. Defaults to "draft" if omitted.'),
        body_html: z.string().optional().describe('The product description in HTML format.'),
        subtitle: z.string().optional().describe('The product subtitle.'),
        vendor: z.string().optional().describe('The product vendor or brand name.'),
        handle: z.string().optional().describe('A unique human-friendly string identifier for the product.'),
        spu: z.string().optional().describe('The Standard Product Unit identifier.'),
        tags: z.string().optional().describe('Tags associated with the product, as a comma-separated string.'),
        product_category: z.string().optional().describe('The product category.'),
        variants: z
            .array(ProductVariantInputSchema)
            .optional()
            .describe('An array of product variants to create. If omitted, a single default variant is generated automatically.'),
        options: z
            .array(ProductOptionInputSchema)
            .optional()
            .describe('An array of product options. Must be defined and consistent with variant option values when variants are provided.'),
        media: z
            .array(ProductMediaInputSchema)
            .optional()
            .describe('An array of media assets to attach to the product. Prefer media over the deprecated images field.')
    })
    .describe('Input data for creating a new product in the SHOPLINE store.');

const ProductVariantOutputSchema = z.object({
    id: z.string().describe('The unique identifier of the variant.'),
    product_id: z.string().describe('The ID of the parent product.'),
    option1: z.string().nullable().describe('The value of the first product option.'),
    option2: z.string().nullable().describe('The value of the second product option.'),
    option3: z.string().nullable().describe('The value of the third product option.'),
    option4: z.string().nullable().describe('The value of the fourth product option.'),
    option5: z.string().nullable().describe('The value of the fifth product option.'),
    price: z.string().describe('The price of the variant.'),
    sku: z.string().nullable().describe('The SKU of the variant.'),
    inventory_tracker: z.boolean().describe('Whether inventory tracking is enabled for this variant.'),
    inventory_item_id: z.string().nullable().describe('The ID of the inventory item associated with this variant.'),
    inventory_quantity: z.number().describe('The inventory quantity of the variant.'),
    created_at: z.string().describe('The creation timestamp in ISO 8601 format.'),
    updated_at: z.string().describe('The last update timestamp in ISO 8601 format.')
});

const ProductOptionOutputSchema = z.object({
    id: z.string().describe('The unique identifier of the option.'),
    product_id: z.string().describe('The ID of the parent product.'),
    name: z.string().describe('The name of the option.'),
    position: z.number().describe('The display position of the option.'),
    values: z.array(z.string()).describe('The possible values for this option.')
});

const ProductMediaOutputSchema = z.object({
    id: z.string().describe('The unique identifier of the media asset.'),
    src: z.string().describe('The source URL of the media asset.'),
    alt: z.string().nullable().describe('The alt text for the media asset.'),
    position: z.number().describe('The display position of the media asset.')
});

const ProductImageOutputSchema = z.object({
    id: z.string().describe('The unique identifier of the image.'),
    src: z.string().describe('The source URL of the image.'),
    alt: z.string().nullable().describe('The alt text for the image.'),
    position: z.number().describe('The display position of the image.')
});

const OutputSchema = z
    .object({
        id: z.string().describe('The unique identifier of the created product.'),
        title: z.string().describe('The product title.'),
        status: z.enum(['active', 'draft', 'archived']).describe('The current status of the product.'),
        body_html: z.string().nullable().describe('The product description in HTML format.'),
        subtitle: z.string().nullable().describe('The product subtitle.'),
        vendor: z.string().nullable().describe('The product vendor.'),
        handle: z.string().describe('The product handle.'),
        spu: z.string().nullable().describe('The Standard Product Unit identifier.'),
        tags: z.string().nullable().describe('Tags associated with the product.'),
        product_category: z.string().nullable().describe('The product category.'),
        variants: z.array(ProductVariantOutputSchema).describe('The product variants.'),
        options: z.array(ProductOptionOutputSchema).describe('The product options.'),
        media: z.array(ProductMediaOutputSchema).describe('The product media assets.'),
        images: z.array(ProductImageOutputSchema).describe('The product images. Deprecated since v20260301; prefer media.'),
        created_at: z.string().describe('The creation timestamp in ISO 8601 format.'),
        updated_at: z.string().describe('The last update timestamp in ISO 8601 format.')
    })
    .describe('The created product object returned by the SHOPLINE API.');

const ProviderProductResponseSchema = z.object({
    product: OutputSchema
});

/**
 * @tags: [write]
 * @tagReason: Creates a new product in the SHOPLINE store.
 * @pitfalls: The auto-generated default variant (created when no variants are supplied) has inventory tracking disabled; stock adjustments on it require first enabling tracking on its inventory item.
 */
const action = createAction({
    description: 'Create a product.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_products'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developer.shopline.com/docs/admin-rest-api/v20260601/products/product/create-product
            endpoint: '/admin/openapi/v20260601/products/products.json',
            data: {
                product: {
                    title: input.title,
                    ...(input.status !== undefined && { status: input.status }),
                    ...(input.body_html !== undefined && { body_html: input.body_html }),
                    ...(input.subtitle !== undefined && { subtitle: input.subtitle }),
                    ...(input.vendor !== undefined && { vendor: input.vendor }),
                    ...(input.handle !== undefined && { handle: input.handle }),
                    ...(input.spu !== undefined && { spu: input.spu }),
                    ...(input.tags !== undefined && { tags: input.tags }),
                    ...(input.product_category !== undefined && { product_category: input.product_category }),
                    ...(input.variants !== undefined && { variants: input.variants }),
                    ...(input.options !== undefined && { options: input.options }),
                    ...(input.media !== undefined && { media: input.media })
                }
            },
            retries: 10
        };

        const response = await nango.post(config);
        const parsed = ProviderProductResponseSchema.parse(response.data);
        return parsed.product;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
