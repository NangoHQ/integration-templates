import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const DiscountSchema = z.object({
    id: z.string(),
    title: z.string(),
    summary: z.string().optional(),
    status: z.string(),
    updatedAt: z.string()
});

const CheckpointSchema = z.object({
    updatedAfter: z.string(),
    cursor: z.string()
});

const EdgeSchema = z.object({
    node: z.object({
        id: z.string(),
        discount: z
            .object({
                title: z.string().optional(),
                summary: z.string().nullable().optional(),
                status: z.string().optional(),
                updatedAt: z.string().optional()
            })
            .optional()
            .nullable()
    })
});

const sync = createSync({
    description: 'Sync Shopify discount nodes with status and summary fields.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    endpoints: [
        {
            path: '/syncs/discounts',
            method: 'GET'
        }
    ],
    models: {
        Discount: DiscountSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const updatedAfter: string | undefined = checkpoint?.updatedAfter || undefined;
        let cursor: string | undefined = checkpoint?.cursor || undefined;
        if (cursor === '') {
            cursor = undefined;
        }

        const limit = 50;

        const proxyConfig: ProxyConfiguration = {
            // https://shopify.dev/docs/api/admin-graphql/latest/queries/discountNodes
            endpoint: '/admin/api/2026-04/graphql.json',
            method: 'POST',
            data: {
                query: `
                    query GetDiscounts($first: Int!, $after: String, $queryFilter: String) {
                        discountNodes(first: $first, after: $after, query: $queryFilter) {
                            edges {
                                node {
                                    id
                                    discount {
                                        ... on DiscountCodeBasic {
                                            title
                                            summary
                                            status
                                            updatedAt
                                        }
                                        ... on DiscountAutomaticBasic {
                                            title
                                            summary
                                            status
                                            updatedAt
                                        }
                                        ... on DiscountCodeBxgy {
                                            title
                                            summary
                                            status
                                            updatedAt
                                        }
                                        ... on DiscountAutomaticBxgy {
                                            title
                                            summary
                                            status
                                            updatedAt
                                        }
                                        ... on DiscountCodeFreeShipping {
                                            title
                                            summary
                                            status
                                            updatedAt
                                        }
                                        ... on DiscountAutomaticFreeShipping {
                                            title
                                            summary
                                            status
                                            updatedAt
                                        }
                                        ... on DiscountCodeApp {
                                            title
                                            status
                                            updatedAt
                                        }
                                        ... on DiscountAutomaticApp {
                                            title
                                            status
                                            updatedAt
                                        }
                                    }
                                }
                            }
                            pageInfo {
                                hasNextPage
                                endCursor
                            }
                        }
                    }
                `,
                variables: {
                    first: limit,
                    after: cursor,
                    queryFilter: updatedAfter ? `updated_at:>'${updatedAfter}'` : undefined
                }
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'variables.after',
                cursor_path_in_response: 'data.discountNodes.pageInfo.endCursor',
                response_path: 'data.discountNodes.edges',
                limit_name_in_request: 'variables.first',
                limit,
                on_page: async ({ nextPageParam }) => {
                    cursor = typeof nextPageParam === 'string' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        let maxUpdatedAt: string | undefined;

        for await (const page of nango.paginate(proxyConfig)) {
            const parsed = z.array(EdgeSchema).safeParse(page);
            if (!parsed.success) {
                throw new Error(`Failed to parse discount edges: ${parsed.error.message}`);
            }

            const discounts = [];
            for (const edge of parsed.data) {
                const discount = edge.node.discount;
                if (!discount || !discount.updatedAt || !discount.title || !discount.status) {
                    continue;
                }
                discounts.push({
                    id: edge.node.id,
                    title: discount.title,
                    ...(discount.summary != null && { summary: discount.summary }),
                    status: discount.status,
                    updatedAt: discount.updatedAt
                });
            }

            if (discounts.length === 0) {
                continue;
            }

            await nango.batchSave(discounts, 'Discount');

            for (const discount of discounts) {
                if (maxUpdatedAt === undefined || discount.updatedAt > maxUpdatedAt) {
                    maxUpdatedAt = discount.updatedAt;
                }
            }

            if (cursor !== undefined) {
                await nango.saveCheckpoint({
                    updatedAfter: updatedAfter || '',
                    cursor
                });
            }
        }

        if (maxUpdatedAt !== undefined) {
            await nango.saveCheckpoint({ updatedAfter: maxUpdatedAt, cursor: '' });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
