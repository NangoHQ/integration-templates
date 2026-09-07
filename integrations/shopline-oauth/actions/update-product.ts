import { z } from 'zod';
import { createAction } from 'nango';

const ProductOptionSchema = z
    .object({
        name: z.string().describe('Option display name. Example: "Color"'),
        values: z.array(z.string()).describe('List of option values. Example: ["Red", "Blue"]')
    })
    .passthrough();

const ProductVariantSchema = z
    .object({
        id: z.string().optional().describe('Variant ID when updating an existing variant. Omit to create a new variant.'),
        option1: z.string().optional().describe('Value for the first product option. Must match an option value if options are defined.'),
        option2: z.string().optional().describe('Value for the second product option.'),
        option3: z.string().optional().describe('Value for the third product option.'),
        option4: z.string().optional().describe('Value for the fourth product option.'),
        option5: z.string().optional().describe('Value for the fifth product option.'),
        price: z.string().optional().describe('Variant price as a string. Example: "19.99"'),
        sku: z.string().optional().describe('Stock keeping unit. Example: "SKU-123"'),
        inventory_quantity: z.number().optional().describe('Inventory quantity for this variant.')
    })
    .passthrough();

const ProductMediaSchema = z
    .object({
        id: z.string().optional().describe('Media ID when updating an existing media item.'),
        src: z.string().optional().describe('Source URL for the media item.'),
        position: z.number().optional().describe('Display order position for the media item.')
    })
    .passthrough();

const InputSchema = z
    .object({
        product_id: z.string().describe('The ID of the product to update.'),
        title: z.string().optional().describe('Product title.'),
        subtitle: z.string().optional().describe('Product subtitle.'),
        body_html: z.string().optional().describe('Product description in HTML format.'),
        handle: z.string().optional().describe('URL-friendly handle for the product.'),
        path: z.string().optional().describe('Product path override.'),
        spu: z.string().optional().describe('Standard Product Unit identifier.'),
        vendor: z.string().optional().describe('Product vendor or brand name.'),
        product_category: z.string().optional().describe('Product category identifier or name.'),
        status: z.enum(['active', 'draft', 'archived']).optional().describe('Product status: active, draft, or archived.'),
        published_scope: z.string().optional().describe('Scope of publication, e.g. "global" or "web".'),
        media: z.array(ProductMediaSchema).optional().describe('List of media items (images, videos) to attach to the product.'),
        options: z.array(ProductOptionSchema).optional().describe('Product options such as Color or Size.'),
        variants: z.array(ProductVariantSchema).optional().describe('Product variants. Each variant must have option values matching the defined options.'),
        tags: z.string().optional().describe('Comma-separated list of tags.'),
        template_path: z.string().optional().describe('Custom template path for the product page.')
    })
    .describe('Input to update an existing SHOPLINE product.');

const ProviderVariantSchema = z
    .object({
        id: z.string().optional().describe('Variant ID.'),
        product_id: z.string().optional().describe('Parent product ID.'),
        option1: z.string().nullable().optional().describe('First option value.'),
        option2: z.string().nullable().optional().describe('Second option value.'),
        option3: z.string().nullable().optional().describe('Third option value.'),
        option4: z.string().nullable().optional().describe('Fourth option value.'),
        option5: z.string().nullable().optional().describe('Fifth option value.'),
        price: z.string().optional().describe('Variant price.'),
        sku: z.string().nullable().optional().describe('Stock keeping unit.'),
        inventory_quantity: z.number().optional().describe('Inventory quantity.'),
        inventory_item_id: z.string().optional().describe('Inventory item ID.')
    })
    .passthrough();

const ProviderImageSchema = z
    .object({
        id: z.string().optional().describe('Image ID.'),
        product_id: z.string().optional().describe('Parent product ID.'),
        position: z.number().optional().describe('Display position.'),
        src: z.string().optional().describe('Image source URL.'),
        width: z.number().optional().describe('Image width in pixels.'),
        height: z.number().optional().describe('Image height in pixels.')
    })
    .passthrough();

const ProviderOptionSchema = z
    .object({
        name: z.string().optional().describe('Option display name.'),
        position: z.number().optional().describe('Option position.'),
        values: z.array(z.string()).optional().describe('List of option values.')
    })
    .passthrough();

const ProviderProductSchema = z
    .object({
        id: z.string(),
        title: z.string().optional(),
        subtitle: z.string().nullable().optional(),
        body_html: z.string().nullable().optional(),
        handle: z.string().optional(),
        path: z.string().nullable().optional(),
        spu: z.string().nullable().optional(),
        vendor: z.string().nullable().optional(),
        product_category: z.string().nullable().optional(),
        status: z.string().optional(),
        published_scope: z.string().optional(),
        tags: z.string().nullable().optional(),
        template_path: z.string().nullable().optional(),
        variants: z.array(ProviderVariantSchema).optional(),
        images: z.array(ProviderImageSchema).optional(),
        options: z.array(ProviderOptionSchema).optional(),
        media: z.array(z.unknown()).optional(),
        created_at: z.string().optional(),
        updated_at: z.string().optional()
    })
    .passthrough();

const OutputSchema = z
    .object({
        id: z.string().describe('Unique product ID.'),
        title: z.string().optional().describe('Product title.'),
        subtitle: z.string().optional().describe('Product subtitle.'),
        body_html: z.string().optional().describe('Product description in HTML.'),
        handle: z.string().optional().describe('URL-friendly handle.'),
        path: z.string().optional().describe('Product path override.'),
        spu: z.string().optional().describe('Standard Product Unit identifier.'),
        vendor: z.string().optional().describe('Product vendor or brand name.'),
        product_category: z.string().optional().describe('Product category.'),
        status: z.string().optional().describe('Product status.'),
        published_scope: z.string().optional().describe('Publication scope.'),
        tags: z.string().optional().describe('Comma-separated tags.'),
        template_path: z.string().optional().describe('Custom template path.'),
        variants: z.array(ProviderVariantSchema).optional().describe('Product variants.'),
        images: z.array(ProviderImageSchema).optional().describe('Product images.'),
        options: z.array(ProviderOptionSchema).optional().describe('Product options.'),
        media: z.array(z.unknown()).optional().describe('Product media items.'),
        created_at: z.string().optional().describe('ISO 8601 creation timestamp.'),
        updated_at: z.string().optional().describe('ISO 8601 last-updated timestamp.')
    })
    .describe('The updated SHOPLINE product.');

/**
 * @tags: [write]
 * @tagReason: Sends a PUT request to update an existing product and its nested resources.
 * @pitfalls: Adding a product's first option requires passing both the new options[] array and updating the existing default variant's option1..5 to match the new option values, otherwise later variant creation fails with a parity validation error.
 */
const action = createAction({
    description: "Update a product's fields, including adding options, variants, and media.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const productId = input.product_id;

        const productPayload: Record<string, unknown> = {};

        if (input.title !== undefined) {
            productPayload['title'] = input.title;
        }
        if (input.subtitle !== undefined) {
            productPayload['subtitle'] = input.subtitle;
        }
        if (input.body_html !== undefined) {
            productPayload['body_html'] = input.body_html;
        }
        if (input.handle !== undefined) {
            productPayload['handle'] = input.handle;
        }
        if (input.path !== undefined) {
            productPayload['path'] = input.path;
        }
        if (input.spu !== undefined) {
            productPayload['spu'] = input.spu;
        }
        if (input.vendor !== undefined) {
            productPayload['vendor'] = input.vendor;
        }
        if (input.product_category !== undefined) {
            productPayload['product_category'] = input.product_category;
        }
        if (input.status !== undefined) {
            productPayload['status'] = input.status;
        }
        if (input.published_scope !== undefined) {
            productPayload['published_scope'] = input.published_scope;
        }
        if (input.media !== undefined) {
            productPayload['media'] = input.media;
        }
        if (input.options !== undefined) {
            productPayload['options'] = input.options;
        }
        if (input.variants !== undefined) {
            productPayload['variants'] = input.variants;
        }
        if (input.tags !== undefined) {
            productPayload['tags'] = input.tags;
        }
        if (input.template_path !== undefined) {
            productPayload['template_path'] = input.template_path;
        }

        // https://developer.shopline.com/docs/admin-rest-api/v20260601/product/product/update-product
        const response = await nango.put({
            endpoint: `/admin/openapi/v20260601/products/${encodeURIComponent(productId)}.json`,
            data: {
                product: productPayload
            },
            retries: 3
        });

        const ProviderResponseSchema = z.object({
            product: ProviderProductSchema
        });

        const providerResponse = ProviderResponseSchema.safeParse(response.data);

        if (!providerResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Provider returned an unexpected product shape after update.',
                details: providerResponse.error.issues
            });
        }

        const product = providerResponse.data.product;

        return {
            id: product.id,
            ...(product.title !== undefined && { title: product.title }),
            ...(product.subtitle != null && { subtitle: product.subtitle }),
            ...(product.body_html != null && { body_html: product.body_html }),
            ...(product.handle !== undefined && { handle: product.handle }),
            ...(product.path != null && { path: product.path }),
            ...(product.spu != null && { spu: product.spu }),
            ...(product.vendor != null && { vendor: product.vendor }),
            ...(product.product_category != null && { product_category: product.product_category }),
            ...(product.status !== undefined && { status: product.status }),
            ...(product.published_scope !== undefined && { published_scope: product.published_scope }),
            ...(product.tags != null && { tags: product.tags }),
            ...(product.template_path != null && { template_path: product.template_path }),
            ...(product.variants !== undefined && { variants: product.variants }),
            ...(product.images !== undefined && { images: product.images }),
            ...(product.options !== undefined && { options: product.options }),
            ...(product.media !== undefined && { media: product.media }),
            ...(product.created_at !== undefined && { created_at: product.created_at }),
            ...(product.updated_at !== undefined && { updated_at: product.updated_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
