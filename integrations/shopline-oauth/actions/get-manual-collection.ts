import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        custom_collection_id: z.string().describe('The unique identifier of the manual collection to retrieve.')
    })
    .describe('Input schema for retrieving a single manual collection by ID.');

const OutputSchema = z
    .object({
        id: z.string().describe('The unique identifier of the manual collection.'),
        title: z.string().describe('The title of the manual collection.'),
        handle: z.string().describe('The URL-friendly handle of the manual collection.'),
        body_html: z.string().nullable().optional().describe('The HTML description of the manual collection.'),
        image: z
            .object({
                src: z.string().optional().describe('The source URL of the collection image.'),
                width: z.number().optional().describe('The width of the collection image in pixels.'),
                height: z.number().optional().describe('The height of the collection image in pixels.')
            })
            .nullable()
            .optional()
            .describe('The image associated with the manual collection.'),
        banner: z.string().nullable().optional().describe('The banner image URL or identifier of the manual collection.'),
        sort_order: z.string().optional().describe('The sort order for products within the collection.'),
        published_scope: z.string().optional().describe('The scope of publication, e.g. global or web.'),
        published_at: z.string().nullable().optional().describe('The ISO 8601 timestamp when the collection was published.'),
        created_at: z.string().optional().describe('The ISO 8601 timestamp when the collection was created.'),
        updated_at: z.string().optional().describe('The ISO 8601 timestamp when the collection was last updated.'),
        path: z.string().optional().describe('The URL path for the collection in the storefront.'),
        template_path: z.string().nullable().optional().describe('The custom template path assigned to the collection.')
    })
    .describe('Output schema representing a single manual collection from the SHOPLINE Admin API.');

const ProviderResponseSchema = z.object({
    custom_collection: z.object({
        id: z.string(),
        title: z.string(),
        handle: z.string(),
        body_html: z.string().nullable().optional(),
        image: z
            .object({
                src: z.string().optional(),
                width: z.number().optional(),
                height: z.number().optional()
            })
            .nullable()
            .optional(),
        banner: z.string().nullable().optional(),
        sort_order: z.string().optional(),
        published_scope: z.string().optional(),
        published_at: z.string().nullable().optional(),
        created_at: z.string().optional(),
        updated_at: z.string().optional(),
        path: z.string().optional(),
        template_path: z.string().nullable().optional()
    })
});

/**
 * @tags: [read]
 * @tagReason: Retrieves a single manual collection by ID from the SHOPLINE Admin API.
 */
const action = createAction({
    description: 'Retrieve a single manual collection by ID.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.shopline.com/docs/admin-rest-api/v20260601/product/custom-collection/get-custom-collection
            endpoint: `/admin/openapi/v20260601/products/custom_collections/${encodeURIComponent(input.custom_collection_id)}.json`,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const collection = providerResponse.custom_collection;

        return {
            id: collection.id,
            title: collection.title,
            handle: collection.handle,
            ...(collection.body_html !== undefined && { body_html: collection.body_html }),
            ...(collection.image !== undefined && { image: collection.image ?? undefined }),
            ...(collection.banner !== undefined && { banner: collection.banner ?? undefined }),
            ...(collection.sort_order !== undefined && { sort_order: collection.sort_order }),
            ...(collection.published_scope !== undefined && { published_scope: collection.published_scope }),
            ...(collection.published_at !== undefined && { published_at: collection.published_at ?? undefined }),
            ...(collection.created_at !== undefined && { created_at: collection.created_at }),
            ...(collection.updated_at !== undefined && { updated_at: collection.updated_at }),
            ...(collection.path !== undefined && { path: collection.path }),
            ...(collection.template_path !== undefined && { template_path: collection.template_path ?? undefined })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
