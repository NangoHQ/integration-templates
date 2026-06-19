import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    first: z.number().int().min(1).max(250).optional().describe('The number of URL redirects to return. Max 250. Example: 10'),
    after: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    query: z.string().optional().describe('A filter query for URL redirects. Example: "path:/old-path"')
});

const UrlRedirectSchema = z.object({
    id: z.string(),
    path: z.string(),
    target: z.string()
});

const PageInfoSchema = z.object({
    hasNextPage: z.boolean(),
    endCursor: z.string().nullable().optional()
});

const UrlRedirectConnectionSchema = z.object({
    edges: z.array(
        z.object({
            node: UrlRedirectSchema
        })
    ),
    pageInfo: PageInfoSchema
});

const GraphQLErrorSchema = z.object({
    message: z.string(),
    extensions: z.record(z.string(), z.unknown()).optional()
});

const GraphQLResponseSchema = z.object({
    data: z
        .object({
            urlRedirects: UrlRedirectConnectionSchema
        })
        .nullable(),
    errors: z.array(GraphQLErrorSchema).optional()
});

const RestRedirectSchema = z.object({
    id: z.number(),
    path: z.string(),
    target: z.string()
});

const RestResponseSchema = z.object({
    redirects: z.array(RestRedirectSchema)
});

const OutputSchema = z.object({
    items: z.array(UrlRedirectSchema),
    next_cursor: z.string().optional()
});

function extractNextPageInfo(linkHeader: string | undefined): string | undefined {
    if (!linkHeader) {
        return undefined;
    }
    const match = linkHeader.match(/page_info=([^&>]+)[^>]*rel="next"/);
    if (match) {
        return match[1];
    }
    return undefined;
}

async function fetchViaGraphQL(
    nango: Parameters<(typeof action)['exec']>[0],
    input: z.infer<typeof InputSchema>
): Promise<z.infer<typeof OutputSchema> | null> {
    const graphqlQuery = `
        query UrlRedirects($first: Int, $after: String, $query: String) {
            urlRedirects(first: $first, after: $after, query: $query) {
                edges {
                    node {
                        id
                        path
                        target
                    }
                }
                pageInfo {
                    hasNextPage
                    endCursor
                }
            }
        }
    `;

    const variables: {
        first?: number;
        after?: string;
        query?: string;
    } = {};
    if (input.first !== undefined) {
        variables.first = input.first;
    }
    if (input.after !== undefined) {
        variables.after = input.after;
    }
    if (input.query !== undefined) {
        variables.query = input.query;
    }

    const response = await nango.post({
        // https://shopify.dev/docs/api/admin-graphql/2025-01/queries/urlRedirects
        endpoint: '/admin/api/2025-01/graphql.json',
        data: {
            query: graphqlQuery,
            variables
        },
        retries: 3
    });

    const parsed = GraphQLResponseSchema.parse(response.data);

    if (parsed.errors && parsed.errors.length > 0) {
        const isAccessDenied = parsed.errors.some((e) => e.message.includes('Access denied'));
        if (isAccessDenied) {
            return null;
        }
        throw new nango.ActionError({
            type: 'graphql_error',
            message: parsed.errors.map((e) => e.message).join(', ')
        });
    }

    if (!parsed.data) {
        throw new nango.ActionError({
            type: 'graphql_error',
            message: 'GraphQL response contained no data'
        });
    }

    const items = parsed.data.urlRedirects.edges.map((edge) => ({
        id: edge.node.id,
        path: edge.node.path,
        target: edge.node.target
    }));

    const nextCursor = parsed.data.urlRedirects.pageInfo.hasNextPage ? (parsed.data.urlRedirects.pageInfo.endCursor ?? undefined) : undefined;

    return {
        items,
        ...(nextCursor !== undefined && { next_cursor: nextCursor })
    };
}

async function fetchViaRest(nango: Parameters<(typeof action)['exec']>[0], input: z.infer<typeof InputSchema>): Promise<z.infer<typeof OutputSchema>> {
    const params: {
        limit?: number;
        page_info?: string;
    } = {};
    if (input.first !== undefined) {
        params.limit = input.first;
    }
    if (input.after !== undefined) {
        params.page_info = input.after;
    }

    const response = await nango.get({
        // https://shopify.dev/docs/api/admin-rest/2025-01/resources/redirect
        endpoint: '/admin/api/2025-01/redirects.json',
        params,
        retries: 3
    });

    const parsed = RestResponseSchema.parse(response.data);

    let items = parsed.redirects.map((redirect) => ({
        id: `gid://shopify/UrlRedirect/${redirect.id}`,
        path: redirect.path,
        target: redirect.target
    }));

    if (input.query !== undefined && input.query.trim().length > 0) {
        const lowerQuery = input.query.toLowerCase();
        items = items.filter(
            (item) =>
                item.path.toLowerCase().includes(lowerQuery) || item.target.toLowerCase().includes(lowerQuery) || item.id.toLowerCase().includes(lowerQuery)
        );
    }

    const linkHeader =
        typeof response.headers === 'object' && response.headers !== null && typeof response.headers['link'] === 'string'
            ? response.headers['link']
            : undefined;
    const nextPageInfo = extractNextPageInfo(linkHeader);

    return {
        items,
        ...(nextPageInfo !== undefined && { next_cursor: nextPageInfo })
    };
}

const action = createAction({
    description: 'List URL redirects in a Shopify store.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_online_store_navigation'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const graphQLResult = await fetchViaGraphQL(nango, input);
        if (graphQLResult !== null) {
            return graphQLResult;
        }

        return await fetchViaRest(nango, input);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
