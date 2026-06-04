import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    first: z.number().optional().describe('The number of markets to return. Default: 50'),
    after: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    reverse: z.boolean().optional().describe('Reverse the order of the underlying list.')
});

const MarketSchema = z.object({
    id: z.string(),
    name: z.string(),
    handle: z.string(),
    status: z.string(),
    type: z.string(),
    enabled: z.boolean()
});

const OutputSchema = z.object({
    items: z.array(MarketSchema),
    next_cursor: z.string().optional()
});

const ProviderMarketSchema = z.object({
    id: z.string(),
    name: z.string(),
    handle: z.string(),
    status: z.string(),
    type: z.string(),
    enabled: z.boolean()
});

const ProviderPageInfoSchema = z.object({
    hasNextPage: z.boolean(),
    endCursor: z.string().nullable().optional()
});

const ProviderMarketsConnectionSchema = z.object({
    nodes: z.array(ProviderMarketSchema),
    pageInfo: ProviderPageInfoSchema
});

const ProviderResponseSchema = z.object({
    data: z.object({
        markets: ProviderMarketsConnectionSchema
    }),
    errors: z
        .array(
            z.object({
                message: z.string()
            })
        )
        .optional()
});

const action = createAction({
    description: 'List Shopify markets for the connected store.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/list-markets',
        group: 'Markets'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_markets'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const variables: Record<string, unknown> = {
            first: input.first ?? 50
        };
        if (input.after !== undefined) {
            variables['after'] = input.after;
        }
        if (input.reverse !== undefined) {
            variables['reverse'] = input.reverse;
        }

        const response = await nango.post({
            // https://shopify.dev/docs/api/admin-graphql/latest/queries/markets
            endpoint: '/admin/api/2026-04/graphql.json',
            data: {
                query: `
                    query Markets($first: Int, $after: String, $reverse: Boolean) {
                        markets(first: $first, after: $after, reverse: $reverse) {
                            nodes {
                                id
                                name
                                handle
                                status
                                type
                                enabled
                            }
                            pageInfo {
                                hasNextPage
                                endCursor
                            }
                        }
                    }
                `,
                variables
            },
            retries: 3
        });

        const payload = ProviderResponseSchema.parse(response.data);

        const firstError = payload.errors?.[0];
        if (firstError) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: firstError.message
            });
        }

        const markets = payload.data.markets;

        return {
            items: markets.nodes.map((node) => ({
                id: node.id,
                name: node.name,
                handle: node.handle,
                status: node.status,
                type: node.type,
                enabled: node.enabled
            })),
            ...(markets.pageInfo.hasNextPage && markets.pageInfo.endCursor != null ? { next_cursor: markets.pageInfo.endCursor } : {})
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
