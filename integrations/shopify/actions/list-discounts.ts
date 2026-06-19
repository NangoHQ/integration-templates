import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    first: z.number().int().min(1).max(250).optional().describe('The number of discount nodes to return (max 250). Default: 50.'),
    after: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    query: z.string().optional().describe('A filter query string using Shopify API search syntax.'),
    savedSearchId: z.string().optional().describe('The ID of a saved search to use as the filter query.')
});

const DiscountNodeSchema = z.object({
    id: z.string(),
    __typename: z.string().optional(),
    discount: z.record(z.string(), z.unknown()).optional()
});

const OutputSchema = z.object({
    nodes: z.array(DiscountNodeSchema),
    nextCursor: z.string().optional().describe('Pagination cursor to fetch the next page. Omit if there are no more pages.')
});

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const action = createAction({
    description: 'List Shopify discount nodes with pagination.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_discounts'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const first = input.first ?? 50;

        const graphQLQuery = `
            query ListDiscounts($first: Int!, $after: String, $query: String, $savedSearchId: ID) {
                discountNodes(first: $first, after: $after, query: $query, savedSearchId: $savedSearchId) {
                    edges {
                        node {
                            id
                            __typename
                            discount {
                                __typename
                                ... on DiscountCodeBasic {
                                    title
                                    summary
                                    status
                                }
                                ... on DiscountAutomaticBasic {
                                    title
                                    summary
                                    status
                                }
                                ... on DiscountCodeBxgy {
                                    title
                                    summary
                                    status
                                }
                                ... on DiscountAutomaticBxgy {
                                    title
                                    summary
                                    status
                                }
                                ... on DiscountCodeFreeShipping {
                                    title
                                    summary
                                    status
                                }
                                ... on DiscountAutomaticFreeShipping {
                                    title
                                    summary
                                    status
                                }
                                ... on DiscountAutomaticApp {
                                    title
                                    status
                                    appDiscountType {
                                        functionId
                                    }
                                }
                                ... on DiscountCodeApp {
                                    title
                                    status
                                    appDiscountType {
                                        functionId
                                    }
                                }
                            }
                        }
                        cursor
                    }
                    pageInfo {
                        hasNextPage
                        endCursor
                    }
                }
            }
        `;

        // https://shopify.dev/docs/api/admin-graphql/latest/queries/discountNodes
        const response = await nango.post({
            endpoint: '/admin/api/2026-04/graphql.json',
            data: {
                query: graphQLQuery,
                variables: {
                    first,
                    ...(input.after !== undefined && { after: input.after }),
                    ...(input.query !== undefined && { query: input.query }),
                    ...(input.savedSearchId !== undefined && { savedSearchId: input.savedSearchId })
                }
            },
            retries: 3
        });

        if (!isRecord(response.data)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Received an invalid response from Shopify.'
            });
        }

        const errors = response.data['errors'];
        if (Array.isArray(errors) && errors.length > 0) {
            const messages = errors
                .map((error) => (isRecord(error) ? String(error['message'] ?? '') : ''))
                .filter(Boolean)
                .join('; ');
            throw new nango.ActionError({
                type: 'graphql_error',
                message: messages || 'GraphQL errors occurred.'
            });
        }

        const data = isRecord(response.data['data']) ? response.data['data'] : response.data;
        const discountNodes = data['discountNodes'];
        if (discountNodes === null || discountNodes === undefined) {
            return { nodes: [] };
        }

        if (!isRecord(discountNodes)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Missing discountNodes in Shopify response.'
            });
        }

        const edges = Array.isArray(discountNodes['edges']) ? discountNodes['edges'] : [];
        const pageInfo = isRecord(discountNodes['pageInfo']) ? discountNodes['pageInfo'] : {};

        const nodes: Array<{ id: string; __typename?: string; discount?: Record<string, unknown> }> = [];

        for (const edge of edges) {
            if (!isRecord(edge)) {
                continue;
            }

            const node = edge['node'];
            if (!isRecord(node)) {
                continue;
            }

            const item: { id: string; __typename?: string; discount?: Record<string, unknown> } = {
                id: String(node['id'] ?? '')
            };

            if (typeof node['__typename'] === 'string') {
                item.__typename = node['__typename'];
            }

            if (isRecord(node['discount'])) {
                item.discount = node['discount'];
            }

            nodes.push(item);
        }

        const hasNextPage = pageInfo['hasNextPage'] === true;
        const endCursor = typeof pageInfo['endCursor'] === 'string' ? pageInfo['endCursor'] : undefined;

        return {
            nodes,
            ...(hasNextPage && endCursor !== undefined && { nextCursor: endCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
