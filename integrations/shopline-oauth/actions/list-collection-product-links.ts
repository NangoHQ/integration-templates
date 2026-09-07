import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
        limit: z.number().int().min(1).max(250).optional().describe('Maximum number of results to return per page (1-250).'),
        product_id: z.string().optional().describe('Filter collects by product ID.'),
        collection_id: z.string().optional().describe('Filter collects by collection ID.'),
        since_id: z.string().optional().describe('Filter collects with an ID greater than the given value.'),
        fields: z.string().optional().describe('Comma-separated list of fields to include in the response.')
    })
    .describe('Input for listing product-collection relationships.');

const ProviderCollectSchema = z.object({
    id: z.number().or(z.string()),
    collection_id: z.number().or(z.string()),
    product_id: z.number().or(z.string()),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    position: z.number().optional(),
    sort_value: z.string().optional(),
    product_priority: z.number().optional()
});

const CollectSchema = z.object({
    id: z.string().describe('The unique ID of the collect relationship.'),
    collection_id: z.string().describe('The ID of the collection.'),
    product_id: z.string().describe('The ID of the product.'),
    created_at: z.string().optional().describe('The date and time when the collect was created.'),
    updated_at: z.string().optional().describe('The date and time when the collect was last updated.'),
    position: z.number().optional().describe('The position of the product in the collection.'),
    sort_value: z.string().optional().describe('The sort value of the product in the collection.'),
    product_priority: z.number().optional().describe('The priority of the product within the collection.')
});

const OutputSchema = z
    .object({
        collects: z.array(CollectSchema).describe('Array of product-collection relationship records.'),
        next_cursor: z.string().optional().describe('Pagination cursor for the next page. Absent when there are no more pages.')
    })
    .describe('Output for listing product-collection relationships.');

/**
 * @tags: [read]
 * @tagReason: Lists existing product-collection relationships from the provider.
 * @pitfalls: Smart collections have no explicit collect records because product membership is rule-computed; filtering by a smart collection ID returns an empty array.
 */
const action = createAction({
    description: 'List product-collection relationships ("collects"), filterable by product or collection.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_products'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {};
        if (input.cursor !== undefined) {
            params['page_info'] = input.cursor;
        }
        if (input.limit !== undefined) {
            params['limit'] = input.limit;
        }
        if (input.product_id !== undefined) {
            params['product_id'] = input.product_id;
        }
        if (input.collection_id !== undefined) {
            params['collection_id'] = input.collection_id;
        }
        if (input.since_id !== undefined) {
            params['since_id'] = input.since_id;
        }
        if (input.fields !== undefined) {
            params['fields'] = input.fields;
        }

        const response = await nango.get({
            // https://developer.shopline.com/docs/admin-rest-api/v20260601/product/collect/list-collects
            endpoint: '/admin/openapi/v20260601/products/collects.json',
            params,
            retries: 3
        });

        const providerResponse = z
            .object({
                collects: z.array(z.unknown())
            })
            .parse(response.data);

        const collects = providerResponse.collects.map((item: unknown) => {
            const parsed = ProviderCollectSchema.parse(item);
            return {
                id: String(parsed.id),
                collection_id: String(parsed.collection_id),
                product_id: String(parsed.product_id),
                ...(parsed.created_at !== undefined && { created_at: parsed.created_at }),
                ...(parsed.updated_at !== undefined && { updated_at: parsed.updated_at }),
                ...(parsed.position !== undefined && { position: parsed.position }),
                ...(parsed.sort_value !== undefined && { sort_value: parsed.sort_value }),
                ...(parsed.product_priority !== undefined && { product_priority: parsed.product_priority })
            };
        });

        let next_cursor: string | undefined;
        const linkHeader = response.headers['link'] || response.headers['Link'];
        if (typeof linkHeader === 'string') {
            const nextLink = linkHeader.split(',').find((part) => part.includes('rel="next"'));
            if (nextLink) {
                const pageInfoMatch = nextLink.match(/page_info=([^&>]+)/);
                if (pageInfoMatch) {
                    next_cursor = pageInfoMatch[1];
                }
            }
        }

        return {
            collects,
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
