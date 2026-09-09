import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        smart_collection_id: z.string().describe('The unique identifier of the smart collection.')
    })
    .describe('Input for retrieving a single smart collection by ID.');

const OutputSchema = z
    .object({
        id: z.string().describe('The unique identifier of the smart collection.'),
        title: z.string().describe('The title of the smart collection.'),
        handle: z.string().optional().describe('The URL-friendly handle of the smart collection.'),
        rules: z.array(z.object({}).passthrough()).optional().describe('The rules that determine which products are included in the collection.'),
        disjunctive: z.boolean().optional().describe('Whether the rules are combined with OR (true) or AND (false).'),
        sort_order: z.string().optional().describe('The sort order of products in the collection.'),
        image: z.object({}).passthrough().optional().describe('The image associated with the smart collection.'),
        banner: z.object({}).passthrough().optional().describe('The banner associated with the smart collection.'),
        body_html: z.string().optional().describe('The HTML description of the smart collection.'),
        published_scope: z.string().optional().describe('The scope of publication (e.g., web, global).'),
        published_at: z.string().optional().describe('The ISO 8601 timestamp when the collection was published.'),
        created_at: z.string().describe('The ISO 8601 timestamp when the collection was created.'),
        updated_at: z.string().describe('The ISO 8601 timestamp when the collection was last updated.'),
        template_path: z.string().optional().describe('The template path used to render the collection.')
    })
    .describe('Output representing a single smart collection retrieved from the provider.');

/**
 * @tags: [read]
 * @tagReason: This action performs a single read-only GET request to retrieve a smart collection by ID.
 * @pitfalls: Smart collection product membership is computed automatically from its rules array; there is no API to manually add or remove individual products, and the collect/bulk-add endpoints only work with manual collections.
 */
const action = createAction({
    description: 'Retrieve a single smart collection by ID.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_products'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.shopline.com/docs/admin-rest-api/v20260601/product/collection/query-intelligent-collection-attributes-by-id
            endpoint: `/admin/openapi/v20260601/products/smart_collections/${encodeURIComponent(input.smart_collection_id)}.json`,
            retries: 3
        });

        if (!response.data || !response.data.smart_collection) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Smart collection not found.',
                smart_collection_id: input.smart_collection_id
            });
        }

        const providerSmartCollection = response.data.smart_collection;

        return {
            id: providerSmartCollection.id,
            title: providerSmartCollection.title,
            ...(providerSmartCollection.handle != null && { handle: providerSmartCollection.handle }),
            ...(providerSmartCollection.rules != null && { rules: providerSmartCollection.rules }),
            ...(providerSmartCollection.disjunctive != null && { disjunctive: providerSmartCollection.disjunctive }),
            ...(providerSmartCollection.sort_order != null && { sort_order: providerSmartCollection.sort_order }),
            ...(providerSmartCollection.image != null && { image: providerSmartCollection.image }),
            ...(providerSmartCollection.banner != null && { banner: providerSmartCollection.banner }),
            ...(providerSmartCollection.body_html != null && { body_html: providerSmartCollection.body_html }),
            ...(providerSmartCollection.published_scope != null && { published_scope: providerSmartCollection.published_scope }),
            ...(providerSmartCollection.published_at != null && { published_at: providerSmartCollection.published_at }),
            created_at: providerSmartCollection.created_at,
            updated_at: providerSmartCollection.updated_at,
            ...(providerSmartCollection.template_path != null && { template_path: providerSmartCollection.template_path })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
