import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    first: z.number().int().min(1).max(250).optional().describe('Number of segments to return. Maximum 250.'),
    after: z.string().optional().describe('Pagination cursor from the previous response.'),
    sortKey: z
        .enum(['CREATION_DATE', 'ID', 'LAST_EDIT_DATE', 'RELEVANCE'])
        .optional()
        .describe('Sort key. Valid values: CREATION_DATE, ID, LAST_EDIT_DATE, RELEVANCE.'),
    reverse: z.boolean().optional().describe('Reverse the order of the list.'),
    query: z.string().optional().describe('Filter query using Shopify search syntax.')
});

const SegmentSchema = z.object({
    id: z.string(),
    name: z.string(),
    creationDate: z.string().optional(),
    lastEditDate: z.string().optional(),
    query: z.string().optional()
});

const OutputSchema = z.object({
    segments: z.array(SegmentSchema),
    next_cursor: z.string().optional()
});

const ShopifyGraphQLErrorSchema = z.object({
    message: z.string(),
    extensions: z.object({}).passthrough().optional()
});

const ShopifySegmentsResponseSchema = z.object({
    data: z
        .object({
            segments: z.object({
                edges: z.array(
                    z.object({
                        cursor: z.string(),
                        node: z.object({
                            id: z.string(),
                            name: z.string(),
                            creationDate: z.string().optional(),
                            lastEditDate: z.string().optional(),
                            query: z.string().optional()
                        })
                    })
                ),
                pageInfo: z.object({
                    hasNextPage: z.boolean()
                })
            })
        })
        .nullable()
        .optional(),
    errors: z.array(ShopifyGraphQLErrorSchema).optional()
});

const action = createAction({
    description: 'List Shopify customer segments with cursor pagination.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-customer-segments',
        group: 'Customer Segments'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_customers'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const graphqlQuery = `
            query segments($first: Int, $after: String, $sortKey: SegmentSortKeys, $reverse: Boolean, $query: String) {
                segments(first: $first, after: $after, sortKey: $sortKey, reverse: $reverse, query: $query) {
                    edges {
                        cursor
                        node {
                            id
                            name
                            creationDate
                            lastEditDate
                            query
                        }
                    }
                    pageInfo {
                        hasNextPage
                    }
                }
            }
        `;

        const variables = {
            first: input.first ?? 50,
            ...(input.after !== undefined && { after: input.after }),
            ...(input.sortKey !== undefined && { sortKey: input.sortKey }),
            ...(input.reverse !== undefined && { reverse: input.reverse }),
            ...(input.query !== undefined && { query: input.query })
        };
        const config: ProxyConfiguration = {
            // https://shopify.dev/docs/api/admin-graphql/latest/queries/segments
            endpoint: '/admin/api/2025-10/graphql.json',
            data: {
                query: graphqlQuery,
                variables
            },
            retries: 3
        };

        // https://shopify.dev/docs/api/admin-graphql/latest/queries/segments
        const response = await nango.post(config);

        if (response.data === null || response.data === undefined) {
            throw new nango.ActionError({
                type: 'empty_response',
                message: 'Received empty response from Shopify API',
                status: response.status,
                statusText: response.statusText
            });
        }

        const parsed = ShopifySegmentsResponseSchema.parse(response.data);

        if (parsed.errors && parsed.errors.length > 0) {
            const errorMessages = parsed.errors.map((err) => err.message).join(', ');
            throw new nango.ActionError({
                type: 'graphql_error',
                message: errorMessages
            });
        }

        if (!parsed.data || !parsed.data.segments) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Shopify API'
            });
        }

        const edges = parsed.data.segments.edges;
        const hasNextPage = parsed.data.segments.pageInfo.hasNextPage;

        const segments = edges.map((edge) => ({
            id: edge.node.id,
            name: edge.node.name,
            ...(edge.node.creationDate !== undefined && { creationDate: edge.node.creationDate }),
            ...(edge.node.lastEditDate !== undefined && { lastEditDate: edge.node.lastEditDate }),
            ...(edge.node.query !== undefined && { query: edge.node.query })
        }));

        const lastEdge = edges[edges.length - 1];
        const next_cursor = hasNextPage && lastEdge ? lastEdge.cursor : undefined;

        return {
            segments,
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
