import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        collect_id: z.string().describe('The unique identifier of the collect (product-collection link) to retrieve.')
    })
    .describe('Input to retrieve a single product-collection link by its ID.');

const ProviderCollectSchema = z.object({
    id: z.union([z.string(), z.number()]),
    collection_id: z.string(),
    product_id: z.string(),
    product_priority: z.number().nullable().optional(),
    sort_value: z.string().nullable().optional(),
    created_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional()
});

const OutputSchema = z
    .object({
        id: z.string().describe('The unique identifier of the collect.'),
        collection_id: z.string().describe('The ID of the collection this product is linked to.'),
        product_id: z.string().describe('The ID of the product linked to this collection.'),
        product_priority: z.number().nullable().optional().describe('Priority of the product within the collection.'),
        sort_value: z.string().nullable().optional().describe('Sort value for ordering within the collection.'),
        created_at: z.string().nullable().optional().describe('ISO 8601 timestamp when the collect was created.'),
        updated_at: z.string().nullable().optional().describe('ISO 8601 timestamp when the collect was last updated.')
    })
    .describe('A single product-collection link (collect) record.');

/**
 * @tags: [read]
 * @tagReason: Retrieves an existing product-collection relationship by its ID.
 * @pitfalls: Collects only exist for manual (custom) collections; smart collections compute membership via rules and have no corresponding collect records.
 */
const action = createAction({
    description: 'Retrieve a single product-collection relationship ("collect") by ID.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_products'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.shopline.com/docs/admin-rest-api/v20260601/product/collect/
        const response = await nango.get({
            endpoint: `/admin/openapi/v20260601/products/collects/${encodeURIComponent(input.collect_id)}.json`,
            retries: 3
        });

        const body = z
            .object({
                collect: ProviderCollectSchema
            })
            .parse(response.data);

        const collect = body.collect;

        return {
            id: String(collect.id),
            collection_id: collect.collection_id,
            product_id: collect.product_id,
            ...(collect.product_priority != null && { product_priority: collect.product_priority }),
            ...(collect.sort_value != null && { sort_value: collect.sort_value }),
            ...(collect.created_at != null && { created_at: collect.created_at }),
            ...(collect.updated_at != null && { updated_at: collect.updated_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
