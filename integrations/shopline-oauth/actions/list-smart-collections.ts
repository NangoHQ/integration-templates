import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        updated_at_min: z.string().optional().describe('ISO 8601 timestamp to filter smart collections updated after this time.'),
        updated_at_max: z.string().optional().describe('ISO 8601 timestamp to filter smart collections updated before this time.'),
        limit: z.number().min(1).max(250).optional().describe('Number of results to return per page (1-250, default 50).'),
        fields: z.string().optional().describe('Comma-separated list of fields to return in the response.'),
        handle: z.string().optional().describe('Filter by smart collection handle.'),
        ids: z.string().optional().describe('Comma-separated list of smart collection IDs to filter.'),
        page_info: z.string().optional().describe('Pagination cursor from the previous response Link header. Omit for the first page.'),
        since_id: z.string().optional().describe('Return only smart collections with an ID greater than this value.'),
        title: z.string().optional().describe('Filter by smart collection title.')
    })
    .describe('Input for listing smart collections.');

const RuleSchema = z.object({
    column: z.string().nullish().describe('Product attribute to match against.'),
    relation: z.string().nullish().describe('Comparison operator for the rule.'),
    condition: z.string().nullish().describe('Value to match against the column.')
});

const SmartCollectionSchema = z
    .object({
        id: z.string().describe('Smart collection ID.'),
        title: z.string().describe('Smart collection title.'),
        handle: z.string().describe('Smart collection handle.'),
        body_html: z.string().nullish().describe('HTML description of the collection.'),
        rules: z.array(RuleSchema).nullish().describe('Rules that define which products belong to this collection.'),
        disjunctive: z.boolean().nullish().describe('Whether the rules are combined with OR (true) or AND (false).'),
        sort_order: z.string().nullish().describe('Default sort order for products in the collection.'),
        template_suffix: z.string().nullish().describe('Template suffix used to render the collection page.'),
        published_scope: z.string().nullish().describe('Scope of publication for the collection.'),
        admin_graphql_api_id: z.string().nullish().describe('GraphQL API identifier for the collection.'),
        updated_at: z.string().nullish().describe('ISO 8601 timestamp when the collection was last updated.'),
        created_at: z.string().nullish().describe('ISO 8601 timestamp when the collection was created.'),
        published_at: z.string().nullish().describe('ISO 8601 timestamp when the collection was published.'),
        image: z.object({}).passthrough().nullish().describe('Image object associated with the collection.')
    })
    .passthrough();

const OutputSchema = z
    .object({
        smart_collections: z.array(SmartCollectionSchema).describe('Array of smart collections matching the query.'),
        next_page_info: z.string().optional().describe('Pagination cursor for the next page, extracted from the Link header.')
    })
    .describe('Output containing the list of smart collections and an optional next-page cursor.');

/**
 * @tags: [read]
 * @tagReason: Reads smart collections from the provider API without any mutations.
 */
const action = createAction({
    description: 'List smart (intelligent, rule-based) collections.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.shopline.com/docs/admin-rest-api/v20260601/products/smart-collections/list-smart-collections
            endpoint: '/admin/openapi/v20260601/products/smart_collections.json',
            params: {
                ...(input.updated_at_min !== undefined && { updated_at_min: input.updated_at_min }),
                ...(input.updated_at_max !== undefined && { updated_at_max: input.updated_at_max }),
                ...(input.limit !== undefined && { limit: String(input.limit) }),
                ...(input.fields !== undefined && { fields: input.fields }),
                ...(input.handle !== undefined && { handle: input.handle }),
                ...(input.ids !== undefined && { ids: input.ids }),
                ...(input.page_info !== undefined && { page_info: input.page_info }),
                ...(input.since_id !== undefined && { since_id: input.since_id }),
                ...(input.title !== undefined && { title: input.title })
            },
            retries: 3
        });

        const data = z
            .object({
                smart_collections: z.array(z.unknown())
            })
            .parse(response.data);

        const smartCollections = data.smart_collections.map((item) => SmartCollectionSchema.parse(item));

        let nextPageInfo: string | undefined;
        const linkHeader = response.headers?.['link'];
        if (typeof linkHeader === 'string') {
            const nextUrlMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
            if (nextUrlMatch && nextUrlMatch[1]) {
                const pageInfoMatch = nextUrlMatch[1].match(/[?&]page_info=([^&]+)/);
                if (pageInfoMatch && pageInfoMatch[1]) {
                    nextPageInfo = decodeURIComponent(pageInfoMatch[1]);
                }
            }
        }

        return {
            smart_collections: smartCollections,
            ...(nextPageInfo !== undefined && { next_page_info: nextPageInfo })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
