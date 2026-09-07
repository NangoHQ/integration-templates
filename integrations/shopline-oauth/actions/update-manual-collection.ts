import { z } from 'zod';
import { createAction } from 'nango';

const CollectInputSchema = z.object({
    id: z.string().optional().describe('The unique identifier for the collect.'),
    product_id: z.string().optional().describe('The unique identifier for the product to link to the collection.'),
    position: z.number().optional().describe('The position of the product in the collection.'),
    sort_value: z.string().optional().describe('The sort value of the collect.'),
    custom_collection_id: z.string().optional().describe('The unique identifier for the custom collection.'),
    created_at: z.string().optional().describe('The date and time when the collect was created.'),
    updated_at: z.string().optional().describe('The date and time when the collect was last updated.')
});

const ImageInputSchema = z.object({
    src: z.string().optional().describe('The source URL of the image.'),
    width: z.number().optional().describe('The width of the image in pixels.'),
    height: z.number().optional().describe('The height of the image in pixels.')
});

const BannerInputSchema = z.object({
    src: z.string().optional().describe('The source URL of the banner image.'),
    width: z.number().optional().describe('The width of the banner in pixels.'),
    height: z.number().optional().describe('The height of the banner in pixels.')
});

const InputSchema = z
    .object({
        custom_collection_id: z.string().describe('The unique identifier for the custom collection to update.'),
        title: z.string().optional().describe('The title of the custom collection.'),
        body_html: z.string().nullable().optional().describe('The HTML content for the custom collection description. Pass null to clear.'),
        handle: z.string().optional().describe('The handle of the custom collection, used in URLs.'),
        path: z.string().optional().describe('The path of the custom collection.'),
        sort_order: z
            .string()
            .optional()
            .describe(
                'The sort order for products in the collection. Examples: "manual", "best-selling", "alpha-asc", "alpha-desc", "price-asc", "price-desc", "created-desc", "created-asc".'
            ),
        published_scope: z.string().optional().describe('The scope of the collection publication. Examples: "global", "web".'),
        template_path: z.string().optional().describe('The template path used to render the collection page.'),
        image: ImageInputSchema.nullable().optional().describe('The image associated with the collection. Pass null to clear.'),
        banner: BannerInputSchema.nullable().optional().describe('The banner image associated with the collection. Pass null to clear.'),
        collects: z.array(CollectInputSchema).optional().describe('An array of collects that link products to this collection.')
    })
    .describe('Input to update a manual collection on the provider.');

const ProviderCollectSchema = z.object({
    id: z.string().optional(),
    product_id: z.string().optional(),
    position: z.number().optional(),
    sort_value: z.string().optional(),
    custom_collection_id: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const ProviderImageSchema = z.object({
    src: z.string().optional(),
    width: z.number().optional(),
    height: z.number().optional()
});

const ProviderBannerSchema = z.object({
    src: z.string().optional(),
    width: z.number().optional(),
    height: z.number().optional()
});

const ProviderCustomCollectionSchema = z.object({
    id: z.string(),
    title: z.string(),
    body_html: z.string().nullable().optional(),
    handle: z.string().optional(),
    path: z.string().optional(),
    sort_order: z.string().optional(),
    published_scope: z.string().optional(),
    template_path: z.string().nullable().optional(),
    image: ProviderImageSchema.nullable().optional(),
    banner: ProviderBannerSchema.nullable().optional(),
    collects: z.array(ProviderCollectSchema).optional(),
    updated_at: z.string().optional(),
    created_at: z.string().optional(),
    published_at: z.string().nullable().optional()
});

const ProviderResponseSchema = z.object({
    custom_collection: ProviderCustomCollectionSchema
});

const CollectOutputSchema = z.object({
    id: z.string().optional().describe('The unique identifier for the collect.'),
    product_id: z.string().optional().describe('The unique identifier for the product in the collect.'),
    position: z.number().optional().describe('The position of the product in the collection.'),
    sort_value: z.string().optional().describe('The sort value of the collect.'),
    custom_collection_id: z.string().optional().describe('The unique identifier for the custom collection.'),
    created_at: z.string().optional().describe('The date and time when the collect was created.'),
    updated_at: z.string().optional().describe('The date and time when the collect was last updated.')
});

const ImageOutputSchema = z.object({
    src: z.string().optional().describe('The source URL of the image.'),
    width: z.number().optional().describe('The width of the image in pixels.'),
    height: z.number().optional().describe('The height of the image in pixels.')
});

const BannerOutputSchema = z.object({
    src: z.string().optional().describe('The source URL of the banner image.'),
    width: z.number().optional().describe('The width of the banner in pixels.'),
    height: z.number().optional().describe('The height of the banner in pixels.')
});

const OutputSchema = z
    .object({
        id: z.string().describe('The unique identifier for the custom collection.'),
        title: z.string().describe('The title of the custom collection.'),
        body_html: z.string().optional().describe('The HTML content for the custom collection description.'),
        handle: z.string().optional().describe('The handle of the custom collection, used in URLs.'),
        path: z.string().optional().describe('The path of the custom collection.'),
        sort_order: z.string().optional().describe('The sort order for products in the collection.'),
        published_scope: z.string().optional().describe('The scope of the collection publication.'),
        template_path: z.string().optional().describe('The template path used to render the collection page.'),
        image: ImageOutputSchema.optional().describe('The image associated with the collection.'),
        banner: BannerOutputSchema.optional().describe('The banner image associated with the collection.'),
        collects: z.array(CollectOutputSchema).optional().describe('An array of collects that link products to this collection.'),
        updated_at: z.string().optional().describe('The date and time when the custom collection was last updated.'),
        created_at: z.string().optional().describe('The date and time when the custom collection was created.'),
        published_at: z.string().optional().describe('The date and time when the custom collection was published.')
    })
    .describe('The updated manual collection returned by the provider.');

/**
 * @tags: [write]
 * @tagReason: Updates an existing manual collection on the provider by issuing a PUT request.
 */
const action = createAction({
    description: "Update a manual collection's fields.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_products', 'write_products'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://developer.shopline.com/docs/admin-rest-api/v20260601/products/custom_collections
            endpoint: `/admin/openapi/v20260601/products/custom_collections/${encodeURIComponent(input.custom_collection_id)}.json`,
            data: {
                custom_collection: {
                    ...(input.title !== undefined && { title: input.title }),
                    ...(input.body_html !== undefined && { body_html: input.body_html }),
                    ...(input.handle !== undefined && { handle: input.handle }),
                    ...(input.path !== undefined && { path: input.path }),
                    ...(input.sort_order !== undefined && { sort_order: input.sort_order }),
                    ...(input.published_scope !== undefined && { published_scope: input.published_scope }),
                    ...(input.template_path !== undefined && { template_path: input.template_path }),
                    ...(input.image !== undefined && { image: input.image }),
                    ...(input.banner !== undefined && { banner: input.banner }),
                    ...(input.collects !== undefined && { collects: input.collects })
                }
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Provider returned an unexpected response format',
                details: parsed.error.message
            });
        }

        const collection = parsed.data.custom_collection;

        return {
            id: collection.id,
            title: collection.title,
            ...(collection.body_html !== undefined && collection.body_html !== null && { body_html: collection.body_html }),
            ...(collection.handle !== undefined && { handle: collection.handle }),
            ...(collection.path !== undefined && { path: collection.path }),
            ...(collection.sort_order !== undefined && { sort_order: collection.sort_order }),
            ...(collection.published_scope !== undefined && { published_scope: collection.published_scope }),
            ...(collection.template_path !== undefined && collection.template_path !== null && { template_path: collection.template_path }),
            ...(collection.image !== undefined && collection.image !== null && { image: collection.image }),
            ...(collection.banner !== undefined && collection.banner !== null && { banner: collection.banner }),
            ...(collection.collects !== undefined && { collects: collection.collects }),
            ...(collection.updated_at !== undefined && { updated_at: collection.updated_at }),
            ...(collection.created_at !== undefined && { created_at: collection.created_at }),
            ...(collection.published_at !== undefined && collection.published_at !== null && { published_at: collection.published_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
