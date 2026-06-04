import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    first: z.number().optional().describe('Number of collections to return. Example: 10'),
    after: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    sortKey: z.string().optional().describe('Sort key. Valid values: ID, TITLE, UPDATED_AT, RELEVANCE. Example: "ID"'),
    reverse: z.boolean().optional().describe('Reverse the order of the underlying list. Default: false'),
    query: z.string().optional().describe('Filter query using Shopify API search syntax. Example: "collection_type:smart"')
});

const CollectionSchema = z.object({
    id: z.string(),
    title: z.string().optional(),
    handle: z.string().optional(),
    updatedAt: z.string().optional(),
    descriptionHtml: z.string().nullable().optional(),
    sortOrder: z.string().optional(),
    templateSuffix: z.string().nullable().optional()
});

const OutputSchema = z.object({
    items: z.array(CollectionSchema),
    nextCursor: z.string().optional()
});

const GraphQLResponseSchema = z.object({
    data: z
        .object({
            collections: z.object({
                edges: z.array(
                    z.object({
                        node: z.object({
                            id: z.string(),
                            title: z.string().optional(),
                            handle: z.string().optional(),
                            updatedAt: z.string().optional(),
                            descriptionHtml: z.string().nullable().optional(),
                            sortOrder: z.string().optional(),
                            templateSuffix: z.string().nullable().optional()
                        }),
                        cursor: z.string()
                    })
                ),
                pageInfo: z.object({
                    hasNextPage: z.boolean(),
                    endCursor: z.string().nullable().optional()
                })
            })
        })
        .optional(),
    errors: z.array(z.unknown()).optional()
});

const action = createAction({
    description: 'List Shopify collections with cursor pagination.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-collections',
        group: 'Collections'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_products'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://shopify.dev/docs/api/admin-graphql/2025-04/queries/collections
            endpoint: '/admin/api/2025-04/graphql.json',
            data: {
                query: `
                    query collections($first: Int!, $after: String, $sortKey: CollectionSortKeys, $reverse: Boolean, $query: String) {
                        collections(first: $first, after: $after, sortKey: $sortKey, reverse: $reverse, query: $query) {
                            edges {
                                node {
                                    id
                                    title
                                    handle
                                    updatedAt
                                    descriptionHtml
                                    sortOrder
                                    templateSuffix
                                }
                                cursor
                            }
                            pageInfo {
                                hasNextPage
                                endCursor
                            }
                        }
                    }
                `,
                variables: {
                    first: input.first ?? 10,
                    after: input.after,
                    sortKey: input.sortKey,
                    reverse: input.reverse,
                    query: input.query
                }
            },
            retries: 3
        };

        const response = await nango.post(config);

        const validated = GraphQLResponseSchema.parse(response.data);

        if (validated.errors && validated.errors.length > 0) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: 'Shopify GraphQL returned errors',
                errors: validated.errors
            });
        }

        if (!validated.data) {
            throw new nango.ActionError({
                type: 'no_data',
                message: 'Shopify GraphQL returned no data'
            });
        }

        const items = validated.data.collections.edges.map((edge) => {
            const node = edge.node;
            return {
                id: node.id,
                ...(node.title !== undefined && { title: node.title }),
                ...(node.handle !== undefined && { handle: node.handle }),
                ...(node.updatedAt !== undefined && { updatedAt: node.updatedAt }),
                ...(node.descriptionHtml != null && { descriptionHtml: node.descriptionHtml }),
                ...(node.sortOrder !== undefined && { sortOrder: node.sortOrder }),
                ...(node.templateSuffix != null && { templateSuffix: node.templateSuffix })
            };
        });

        return {
            items,
            ...(validated.data.collections.pageInfo.hasNextPage && validated.data.collections.pageInfo.endCursor != null
                ? { nextCursor: validated.data.collections.pageInfo.endCursor }
                : {})
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
