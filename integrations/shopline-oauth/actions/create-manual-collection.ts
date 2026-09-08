import { z } from 'zod';
import { createAction } from 'nango';

const InputCollectSchema = z.object({
    product_id: z.string().describe('The ID of the product to include in the collection'),
    position: z.number().optional().describe('The display position of the product in the collection'),
    sort_value: z.string().optional().describe('Sort value for ordering the product in the collection')
});

const InputImageSchema = z.object({
    src: z.string().optional().describe('Image source URL'),
    alt: z.string().optional().describe('Image alt text')
});

const InputSchema = z
    .object({
        title: z.string().describe('The name of the collection. Must be unique within the store.'),
        collects: z.array(InputCollectSchema).max(500).optional().describe('Products to link to the collection when it is created, up to 500 items'),
        published_scope: z.string().optional().describe('The scope of publication, typically "web"'),
        sort_order: z.string().optional().describe('How products are sorted in the collection, defaults to "manual" when not specified'),
        banner: z.string().optional().describe('Banner image URL or identifier for the collection'),
        body_html: z.string().optional().describe('HTML description of the collection'),
        handle: z.string().optional().describe('URL-friendly unique identifier for the collection'),
        image: InputImageSchema.optional().describe('Collection image'),
        path: z.string().optional().describe('Custom path for the collection'),
        template_path: z.string().optional().describe('Template path for rendering the collection')
    })
    .describe('Input for creating a manual collection');

const ProviderCollectSchema = z.object({
    id: z.string().optional(),
    product_id: z.string().optional(),
    collection_id: z.string().optional(),
    position: z.number().optional(),
    sort_value: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const ProviderImageSchema = z.object({
    src: z.string().optional().nullable(),
    alt: z.string().optional().nullable()
});

const ProviderCustomCollectionSchema = z.object({
    id: z.string(),
    title: z.string(),
    handle: z.string().optional().nullable(),
    body_html: z.string().optional().nullable(),
    sort_order: z.string().optional().nullable(),
    published_scope: z.string().optional().nullable(),
    banner: z.string().optional().nullable(),
    path: z.string().optional().nullable(),
    template_path: z.string().optional().nullable(),
    image: ProviderImageSchema.optional().nullable(),
    collects: z.array(ProviderCollectSchema).optional().nullable(),
    created_at: z.string().optional().nullable(),
    updated_at: z.string().optional().nullable()
});

const OutputCollectSchema = z.object({
    id: z.string().optional().describe('Unique identifier of the collect record'),
    product_id: z.string().optional().describe('The product ID in the collection'),
    collection_id: z.string().optional().describe('The collection ID'),
    position: z.number().optional().describe('Position of the product in the collection'),
    sort_value: z.string().optional().describe('Sort value for ordering products'),
    created_at: z.string().optional().describe('When the collect was created'),
    updated_at: z.string().optional().describe('When the collect was last updated')
});

const OutputImageSchema = z.object({
    src: z.string().optional().describe('Image source URL'),
    alt: z.string().optional().describe('Image alt text')
});

const OutputSchema = z
    .object({
        id: z.string().describe('The unique identifier of the created collection'),
        title: z.string().describe('The name of the collection'),
        handle: z.string().optional().describe('URL-friendly unique identifier'),
        body_html: z.string().optional().describe('HTML description of the collection'),
        sort_order: z.string().optional().describe('How products are sorted in the collection'),
        published_scope: z.string().optional().describe('The scope of publication'),
        banner: z.string().optional().describe('Banner image URL or identifier'),
        path: z.string().optional().describe('Custom path for the collection'),
        template_path: z.string().optional().describe('Template path for rendering the collection'),
        image: OutputImageSchema.optional().describe('Collection image'),
        collects: z.array(OutputCollectSchema).optional().describe('Products linked to the collection'),
        created_at: z.string().optional().describe('When the collection was created'),
        updated_at: z.string().optional().describe('When the collection was last updated')
    })
    .describe('The created manual collection');

/**
 * @tags: [write]
 * @tagReason: Creates a new manual collection on the SHOPLINE store.
 * @pitfalls: The provider silently appends a numeric suffix to a non-unique handle instead of returning an error, and published_scope is always 'web'.
 */
const action = createAction({
    description: 'Create a manual (custom) collection.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_products'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {
            custom_collection: {
                title: input.title,
                ...(input.collects !== undefined && { collects: input.collects }),
                ...(input.published_scope !== undefined && { published_scope: input.published_scope }),
                ...(input.sort_order !== undefined && { sort_order: input.sort_order }),
                ...(input.banner !== undefined && { banner: input.banner }),
                ...(input.body_html !== undefined && { body_html: input.body_html }),
                ...(input.handle !== undefined && { handle: input.handle }),
                ...(input.image !== undefined && { image: input.image }),
                ...(input.path !== undefined && { path: input.path }),
                ...(input.template_path !== undefined && { template_path: input.template_path })
            }
        };

        const response = await nango.post({
            // https://developer.shopline.com/docs/admin-rest-api/v20260601/products/custom-collections/create-custom-collection
            endpoint: '/admin/openapi/v20260601/products/custom_collections.json',
            data: body,
            retries: 3
        });

        const parsedResponse = z
            .object({
                custom_collection: ProviderCustomCollectionSchema
            })
            .parse(response.data);

        const providerCollection = parsedResponse.custom_collection;

        return {
            id: providerCollection.id,
            title: providerCollection.title,
            ...(providerCollection.handle != null && { handle: providerCollection.handle }),
            ...(providerCollection.body_html != null && { body_html: providerCollection.body_html }),
            ...(providerCollection.sort_order != null && { sort_order: providerCollection.sort_order }),
            ...(providerCollection.published_scope != null && { published_scope: providerCollection.published_scope }),
            ...(providerCollection.banner != null && { banner: providerCollection.banner }),
            ...(providerCollection.path != null && { path: providerCollection.path }),
            ...(providerCollection.template_path != null && { template_path: providerCollection.template_path }),
            ...(providerCollection.image != null && {
                image: {
                    ...(providerCollection.image.src != null && { src: providerCollection.image.src }),
                    ...(providerCollection.image.alt != null && { alt: providerCollection.image.alt })
                }
            }),
            ...(providerCollection.collects != null && {
                collects: providerCollection.collects.map((collect) => ({
                    ...(collect.id != null && { id: collect.id }),
                    ...(collect.product_id != null && { product_id: collect.product_id }),
                    ...(collect.collection_id != null && { collection_id: collect.collection_id }),
                    ...(collect.position != null && { position: collect.position }),
                    ...(collect.sort_value != null && { sort_value: collect.sort_value }),
                    ...(collect.created_at != null && { created_at: collect.created_at }),
                    ...(collect.updated_at != null && { updated_at: collect.updated_at })
                }))
            }),
            ...(providerCollection.created_at != null && { created_at: providerCollection.created_at }),
            ...(providerCollection.updated_at != null && { updated_at: providerCollection.updated_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
