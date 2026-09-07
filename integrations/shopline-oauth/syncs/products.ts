import { createSync, ProxyConfiguration } from 'nango';
import { z } from 'zod';

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const ProviderProductImageSchema = z.object({
    id: z.string(),
    alt: z.string().nullish(),
    src: z.string().nullish()
});

const ProviderProductMediaSchema = z.object({
    id: z.string(),
    content_type: z.string().nullish(),
    preview_image: z.string().nullish(),
    src: z.string().nullish(),
    alt: z.string().nullish()
});

const ProviderProductOptionValueSchema = z.object({
    id: z.string(),
    value: z.string().nullish()
});

const ProviderProductOptionSchema = z.object({
    id: z.string(),
    name: z.string().nullish(),
    product_id: z.string().nullish(),
    values: z.array(z.string()).nullish(),
    option_values: z.array(ProviderProductOptionValueSchema).nullish(),
    values_colors: z.record(z.string(), z.string()).nullish(),
    values_images: z.record(z.string(), z.string()).nullish()
});

const ProviderProductVariantImageSchema = z.object({
    id: z.string(),
    alt: z.string().nullish(),
    src: z.string().nullish()
});

const ProviderProductVariantSchema = z.object({
    id: z.string(),
    product_id: z.string().nullish(),
    title: z.string().nullish(),
    sku: z.string().nullish(),
    barcode: z.string().nullish(),
    price: z.string().nullish(),
    compare_at_price: z.string().nullish(),
    weight: z.string().nullish(),
    weight_unit: z.string().nullish(),
    position: z.number().nullish(),
    inventory_policy: z.string().nullish(),
    inventory_quantity: z.number().nullish(),
    inventory_item_id: z.string().nullish(),
    inventory_tracker: z.boolean().nullish(),
    taxable: z.boolean().nullish(),
    required_shipping: z.boolean().nullish(),
    option1: z.string().nullish(),
    option2: z.string().nullish(),
    option3: z.string().nullish(),
    option4: z.string().nullish(),
    option5: z.string().nullish(),
    image: ProviderProductVariantImageSchema.nullish()
});

const ProviderProductSchema = z.object({
    id: z.string(),
    title: z.string().nullish(),
    body_html: z.string().nullish(),
    created_at: z.string().nullish(),
    updated_at: z.string().nullish(),
    published_at: z.string().nullish(),
    handle: z.string().nullish(),
    status: z.string().nullish(),
    tags: z.string().nullish(),
    vendor: z.string().nullish(),
    product_type: z.string().nullish(),
    product_category: z.string().nullish(),
    published_scope: z.string().nullish(),
    spu: z.string().nullish(),
    subtitle: z.string().nullish(),
    template_path: z.string().nullish(),
    path: z.string().nullish(),
    product_behavior: z.string().nullish(),
    image: ProviderProductImageSchema.nullish(),
    featured_media: ProviderProductMediaSchema.nullish(),
    media: z.array(ProviderProductMediaSchema).nullish(),
    images: z.array(ProviderProductImageSchema).nullish(),
    options: z.array(ProviderProductOptionSchema).nullish(),
    variants: z.array(ProviderProductVariantSchema).nullish()
});

const ProductImageSchema = z
    .object({
        id: z.string().describe('The unique identifier for the product image.'),
        alt: z.string().optional().describe('The alternative textual description of the product image.'),
        src: z.string().optional().describe('The URL link to the product image.')
    })
    .describe('An image associated with a product.');

const ProductMediaSchema = z
    .object({
        id: z.string().describe('The unique identifier for the product media.'),
        content_type: z.string().optional().describe('The type of the media, such as IMAGE, VIDEO, or EXTERNAL_VIDEO.'),
        preview_image: z.string().optional().describe('The URL of the product media cover image.'),
        src: z.string().optional().describe('The link to the media.'),
        alt: z.string().optional().describe('The alternative textual description of the product media.')
    })
    .describe('A media item associated with a product, including images and videos.');

const ProductOptionValueSchema = z
    .object({
        id: z.string().describe('The unique identifier for the option value.'),
        value: z.string().optional().describe('The option value, such as a color or size.')
    })
    .describe('A single option value for a product option.');

const ProductOptionSchema = z
    .object({
        id: z.string().describe('The unique identifier for the product option.'),
        name: z.string().optional().describe('The name of the option, for example Color or Size.'),
        product_id: z.string().optional().describe('The unique identifier for the product corresponding to the option.'),
        values: z.array(z.string()).optional().describe('A list of option values as strings.'),
        option_values: z.array(ProductOptionValueSchema).optional().describe('A list of product option values with ids.'),
        values_colors: z.record(z.string(), z.string()).optional().describe('Mapping between option values and hexadecimal color codes.'),
        values_images: z.record(z.string(), z.string()).optional().describe('Mapping between option values and corresponding image URLs.')
    })
    .describe('A product option, such as Color or Size.');

const ProductVariantSchema = z
    .object({
        id: z.string().describe('The unique identifier for the product variant.'),
        product_id: z.string().optional().describe('The unique identifier for the product corresponding to the variant.'),
        title: z.string().optional().describe('The title of the variant, assembled from its option values.'),
        sku: z.string().optional().describe('The product SKU, distinct from the variant id.'),
        barcode: z.string().optional().describe('The barcode of the variant.'),
        price: z.string().optional().describe('The selling price of the variant, rounded to two decimal places.'),
        compare_at_price: z.string().optional().describe('The original price of the variant before discounts.'),
        weight: z.string().optional().describe('The weight of the variant, rounded up to two decimal places.'),
        weight_unit: z.string().optional().describe('The unit of weight for the variant, such as g, kg, lb, or oz.'),
        position: z.number().optional().describe('The ordering position of the variant within the variant list.'),
        inventory_policy: z.string().optional().describe('Whether the variant is allowed to be oversold. Values are deny or continue.'),
        inventory_quantity: z.number().optional().describe('The total inventory quantity at all storage locations.'),
        inventory_item_id: z.string().optional().describe('The unique identifier for the inventory item.'),
        inventory_tracker: z.boolean().optional().describe('Whether inventory tracking is enabled for this variant.'),
        taxable: z.boolean().optional().describe('Whether the variant is subject to tax.'),
        required_shipping: z.boolean().optional().describe('Whether the variant requires shipping.'),
        option1: z.string().optional().describe('The first option value for the variant.'),
        option2: z.string().optional().describe('The second option value for the variant.'),
        option3: z.string().optional().describe('The third option value for the variant.'),
        option4: z.string().optional().describe('The fourth option value for the variant.'),
        option5: z.string().optional().describe('The fifth option value for the variant.'),
        image: ProductImageSchema.optional().describe('The image associated with the variant.')
    })
    .describe('A product variant representing a specific combination of options.');

const ProductSchema = z
    .object({
        id: z.string().describe('The unique identifier for the product.'),
        title: z.string().optional().describe('The title of the product.'),
        body_html: z.string().optional().describe('The product description in HTML format.'),
        created_at: z.string().optional().describe('The date and time when the product was created, in ISO 8601 format.'),
        updated_at: z.string().optional().describe('The date and time when the product was last updated, in ISO 8601 format.'),
        published_at: z.string().optional().describe('The date and time when the product was published to the online store, in ISO 8601 format.'),
        handle: z.string().optional().describe('The semantically unique identifier for the product, generated based on its title by default.'),
        status: z.string().optional().describe('The status of the product. Valid values are active, draft, or archived.'),
        tags: z.string().optional().describe('A comma-separated list of tags associated with the product.'),
        vendor: z.string().optional().describe('The brand or vendor of the product.'),
        product_type: z.string().optional().describe('The source of the product. Valid values are NORMAL, POD_TEMPORARY, or TEMPORARY.'),
        product_category: z.string().optional().describe('The product category customized by the merchant.'),
        published_scope: z.string().optional().describe('The published scope of the product, typically web for the online store.'),
        spu: z.string().optional().describe('The merchant-customized identifier for the product, distinct from the product id.'),
        subtitle: z.string().optional().describe('The subtitle of the product.'),
        template_path: z.string().optional().describe('The theme template used for the product page.'),
        path: z.string().optional().describe('The relative path of the product page.'),
        product_behavior: z.string().optional().describe('Used to identify special behavior of the product, such as RISK or HIDDEN.'),
        image: ProductImageSchema.optional().describe('The cover image of the product.'),
        featured_media: ProductMediaSchema.optional().describe('The featured media of the product.'),
        media: z.array(ProductMediaSchema).optional().describe('A list of product media items.'),
        images: z.array(ProductImageSchema).optional().describe('A list of product images.'),
        options: z.array(ProductOptionSchema).optional().describe('A list of product options.'),
        variants: z.array(ProductVariantSchema).optional().describe('A list of product variants.')
    })
    .describe('A product in the SHOPLINE store, including its embedded variants, options, and media.');

function mapImage(image: z.infer<typeof ProviderProductImageSchema>): z.infer<typeof ProductImageSchema> {
    return {
        id: image.id,
        ...(image.alt != null && { alt: image.alt }),
        ...(image.src != null && { src: image.src })
    };
}

function mapMedia(media: z.infer<typeof ProviderProductMediaSchema>): z.infer<typeof ProductMediaSchema> {
    return {
        id: media.id,
        ...(media.content_type != null && { content_type: media.content_type }),
        ...(media.preview_image != null && { preview_image: media.preview_image }),
        ...(media.src != null && { src: media.src }),
        ...(media.alt != null && { alt: media.alt })
    };
}

function mapOptionValue(value: z.infer<typeof ProviderProductOptionValueSchema>): z.infer<typeof ProductOptionValueSchema> {
    return {
        id: value.id,
        ...(value.value != null && { value: value.value })
    };
}

function mapOption(option: z.infer<typeof ProviderProductOptionSchema>): z.infer<typeof ProductOptionSchema> {
    return {
        id: option.id,
        ...(option.name != null && { name: option.name }),
        ...(option.product_id != null && { product_id: option.product_id }),
        ...(option.values != null && { values: option.values }),
        ...(option.option_values != null && { option_values: option.option_values.map(mapOptionValue) }),
        ...(option.values_colors != null && { values_colors: option.values_colors }),
        ...(option.values_images != null && { values_images: option.values_images })
    };
}

function mapVariant(variant: z.infer<typeof ProviderProductVariantSchema>): z.infer<typeof ProductVariantSchema> {
    return {
        id: variant.id,
        ...(variant.product_id != null && { product_id: variant.product_id }),
        ...(variant.title != null && { title: variant.title }),
        ...(variant.sku != null && { sku: variant.sku }),
        ...(variant.barcode != null && { barcode: variant.barcode }),
        ...(variant.price != null && { price: variant.price }),
        ...(variant.compare_at_price != null && { compare_at_price: variant.compare_at_price }),
        ...(variant.weight != null && { weight: variant.weight }),
        ...(variant.weight_unit != null && { weight_unit: variant.weight_unit }),
        ...(variant.position != null && { position: variant.position }),
        ...(variant.inventory_policy != null && { inventory_policy: variant.inventory_policy }),
        ...(variant.inventory_quantity != null && { inventory_quantity: variant.inventory_quantity }),
        ...(variant.inventory_item_id != null && { inventory_item_id: variant.inventory_item_id }),
        ...(variant.inventory_tracker != null && { inventory_tracker: variant.inventory_tracker }),
        ...(variant.taxable != null && { taxable: variant.taxable }),
        ...(variant.required_shipping != null && { required_shipping: variant.required_shipping }),
        ...(variant.option1 != null && { option1: variant.option1 }),
        ...(variant.option2 != null && { option2: variant.option2 }),
        ...(variant.option3 != null && { option3: variant.option3 }),
        ...(variant.option4 != null && { option4: variant.option4 }),
        ...(variant.option5 != null && { option5: variant.option5 }),
        ...(variant.image != null && { image: mapImage(variant.image) })
    };
}

function mapProduct(product: z.infer<typeof ProviderProductSchema>): z.infer<typeof ProductSchema> {
    return {
        id: product.id,
        ...(product.title != null && { title: product.title }),
        ...(product.body_html != null && { body_html: product.body_html }),
        ...(product.created_at != null && { created_at: product.created_at }),
        ...(product.updated_at != null && { updated_at: product.updated_at }),
        ...(product.published_at != null && { published_at: product.published_at }),
        ...(product.handle != null && { handle: product.handle }),
        ...(product.status != null && { status: product.status }),
        ...(product.tags != null && { tags: product.tags }),
        ...(product.vendor != null && { vendor: product.vendor }),
        ...(product.product_type != null && { product_type: product.product_type }),
        ...(product.product_category != null && { product_category: product.product_category }),
        ...(product.published_scope != null && { published_scope: product.published_scope }),
        ...(product.spu != null && { spu: product.spu }),
        ...(product.subtitle != null && { subtitle: product.subtitle }),
        ...(product.template_path != null && { template_path: product.template_path }),
        ...(product.path != null && { path: product.path }),
        ...(product.product_behavior != null && { product_behavior: product.product_behavior }),
        ...(product.image != null && { image: mapImage(product.image) }),
        ...(product.featured_media != null && { featured_media: mapMedia(product.featured_media) }),
        ...(product.media != null && { media: product.media.map(mapMedia) }),
        ...(product.images != null && { images: product.images.map(mapImage) }),
        ...(product.options != null && { options: product.options.map(mapOption) }),
        ...(product.variants != null && { variants: product.variants.map(mapVariant) })
    };
}

const sync = createSync({
    description: 'Sync products, including their embedded variants, options, and images/media.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Product: ProductSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const updatedAfter = checkpoint != null ? checkpoint['updated_after'] : undefined;
        const isFullRefresh = updatedAfter == null;

        if (isFullRefresh) {
            await nango.trackDeletesStart('Product');
        }

        const proxyConfig: ProxyConfiguration = {
            // https://developer.shopline.com/docs/admin-rest-api/v20260601/product/product/get-products
            endpoint: '/admin/openapi/v20260601/products/products.json',
            params: updatedAfter != null ? { updated_at_min: updatedAfter } : {},
            paginate: {
                type: 'link',
                link_rel_in_response_header: 'next',
                limit_name_in_request: 'limit',
                response_path: 'products',
                limit: 50
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const items: unknown[] = page;
            const products = items.map((item) => mapProduct(ProviderProductSchema.parse(item)));

            if (products.length > 0) {
                await nango.batchSave(products, 'Product');

                const lastProduct = products.at(-1);
                if (lastProduct != null) {
                    const lastUpdatedAt = lastProduct.updated_at;
                    if (lastUpdatedAt != null) {
                        await nango.saveCheckpoint({
                            updated_after: lastUpdatedAt
                        });
                    }
                }
            }
        }

        if (isFullRefresh) {
            await nango.trackDeletesEnd('Product');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
