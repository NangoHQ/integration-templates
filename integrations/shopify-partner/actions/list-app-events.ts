import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    appId: z.string().describe('The app GID. Example: gid://partners/App/1234'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    first: z.number().int().min(1).max(250).optional().describe('Number of events to return per page. Default: 50.'),
    shopId: z.string().optional().describe('Shop GID to filter by. Example: gid://partners/Shop/1234'),
    occurredAtMin: z.string().optional().describe('Return events on or after this ISO 8601 datetime.'),
    occurredAtMax: z.string().optional().describe('Return events on or before this ISO 8601 datetime.')
});

const ProviderResponseSchema = z.object({
    data: z.object({
        app: z
            .object({
                events: z.object({
                    edges: z.array(
                        z.object({
                            cursor: z.string(),
                            node: z.object({
                                type: z.string(),
                                occurredAt: z.string(),
                                app: z.object({
                                    id: z.string(),
                                    name: z.string()
                                }),
                                shop: z.object({
                                    id: z.string(),
                                    name: z.string(),
                                    myshopifyDomain: z.string()
                                })
                            })
                        })
                    ),
                    pageInfo: z.object({
                        hasNextPage: z.boolean()
                    })
                })
            })
            .nullable()
    }),
    errors: z
        .array(
            z.object({
                message: z.string(),
                path: z.array(z.unknown()).optional()
            })
        )
        .optional()
});

const OutputSchema = z.object({
    events: z.array(
        z.object({
            type: z.string(),
            occurredAt: z.string(),
            app: z.object({
                id: z.string(),
                name: z.string()
            }),
            shop: z.object({
                id: z.string(),
                name: z.string(),
                myshopifyDomain: z.string()
            })
        })
    ),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List historical events for a single known Partner app.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://shopify.dev/docs/api/partner/latest/queries/app
        const response = await nango.post({
            endpoint: '2026-07/graphql.json',
            data: {
                query: `
                    query AppEvents($id: ID!, $first: Int, $after: String, $shopId: ID, $occurredAtMin: DateTime, $occurredAtMax: DateTime) {
                        app(id: $id) {
                            events(first: $first, after: $after, shopId: $shopId, occurredAtMin: $occurredAtMin, occurredAtMax: $occurredAtMax) {
                                edges {
                                    cursor
                                    node {
                                        type
                                        occurredAt
                                        app {
                                            id
                                            name
                                        }
                                        shop {
                                            id
                                            name
                                            myshopifyDomain
                                        }
                                    }
                                }
                                pageInfo {
                                    hasNextPage
                                }
                            }
                        }
                    }
                `,
                variables: {
                    id: input.appId,
                    first: input.first ?? 50,
                    ...(input.cursor !== undefined && { after: input.cursor }),
                    ...(input.shopId !== undefined && { shopId: input.shopId }),
                    ...(input.occurredAtMin !== undefined && { occurredAtMin: input.occurredAtMin }),
                    ...(input.occurredAtMax !== undefined && { occurredAtMax: input.occurredAtMax })
                }
            },
            retries: 3
        });

        if (response.data && Array.isArray(response.data.errors) && response.data.errors.length > 0) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: response.data.errors[0].message,
                errors: response.data.errors
            });
        }

        const parsed = ProviderResponseSchema.parse(response.data);

        if (parsed.data.app == null) {
            await nango.log(`App returned null for ${input.appId}; may not exist or may not be accessible`);
            return { events: [] };
        }

        const edges = parsed.data.app.events.edges;
        const pageInfo = parsed.data.app.events.pageInfo;
        const lastEdge = edges.length > 0 ? edges[edges.length - 1] : undefined;

        return {
            events: edges.map((edge) => ({
                type: edge.node.type,
                occurredAt: edge.node.occurredAt,
                app: {
                    id: edge.node.app.id,
                    name: edge.node.app.name
                },
                shop: {
                    id: edge.node.shop.id,
                    name: edge.node.shop.name,
                    myshopifyDomain: edge.node.shop.myshopifyDomain
                }
            })),
            ...(pageInfo.hasNextPage && lastEdge ? { nextCursor: lastEdge.cursor } : {})
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
