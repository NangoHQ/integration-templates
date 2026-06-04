import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const MarketSchema = z.object({
    id: z.string(),
    name: z.string(),
    handle: z.string(),
    enabled: z.boolean().optional(),
    status: z.string().optional(),
    regions: z
        .array(
            z.object({
                name: z.string(),
                code: z.string().optional()
            })
        )
        .optional(),
    currencySettings: z
        .object({
            baseCurrencyCode: z.string().optional(),
            localCurrencies: z.boolean().optional(),
            roundingEnabled: z.boolean().optional()
        })
        .optional(),
    webPresence: z
        .object({
            id: z.string().optional(),
            domain: z.string().optional(),
            subfolderSuffix: z.string().optional(),
            rootUrls: z
                .array(
                    z.object({
                        locale: z.string(),
                        url: z.string()
                    })
                )
                .optional()
        })
        .optional()
});

const ProviderMarketNodeSchema = z.object({
    id: z.string(),
    name: z.string(),
    handle: z.string(),
    enabled: z.boolean().optional(),
    status: z.string().optional(),
    regions: z
        .object({
            nodes: z
                .array(
                    z.object({
                        name: z.string(),
                        code: z.string().optional()
                    })
                )
                .optional()
        })
        .nullable()
        .optional(),
    currencySettings: z
        .object({
            baseCurrency: z
                .object({
                    currencyCode: z.string().optional()
                })
                .optional(),
            localCurrencies: z.boolean().optional(),
            roundingEnabled: z.boolean().optional()
        })
        .nullable()
        .optional(),
    webPresence: z
        .object({
            id: z.string().optional(),
            domain: z
                .object({
                    host: z.string().optional()
                })
                .optional(),
            subfolderSuffix: z.string().optional(),
            rootUrls: z
                .array(
                    z.object({
                        locale: z.string(),
                        url: z.string()
                    })
                )
                .optional()
        })
        .nullable()
        .optional()
});

const CheckpointSchema = z.object({
    cursor: z.string()
});

const sync = createSync({
    description: 'Sync Shopify markets and their regional configuration.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Market: MarketSchema
    },
    // https://shopify.dev/docs/api/admin-graphql/latest/queries/markets
    endpoints: [
        {
            method: 'POST',
            path: '/syncs/markets'
        }
    ],

    exec: async (nango) => {
        const checkpoint = CheckpointSchema.parse((await nango.getCheckpoint()) ?? { cursor: '' });
        let cursor = checkpoint.cursor || undefined;

        // Blocker: the Shopify markets GraphQL endpoint does not support
        // updated_at or modified_since filtering, and there is no
        // changed-records or deleted-records endpoint for markets.
        await nango.trackDeletesStart('Market');

        // https://shopify.dev/docs/api/admin-graphql/latest/queries/markets
        const proxyConfig: ProxyConfiguration = {
            // https://shopify.dev/docs/api/admin-graphql/latest/queries/markets
            endpoint: '/admin/api/2026-04/graphql.json',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            data: {
                query: `
                    query Markets($first: Int!, $after: String) {
                        markets(first: $first, after: $after) {
                            nodes {
                                id
                                name
                                handle
                                enabled
                                status
                                regions(first: 100) {
                                    nodes {
                                        name
                                        ... on MarketRegionCountry {
                                            code
                                        }
                                    }
                                }
                                currencySettings {
                                    baseCurrency {
                                        currencyCode
                                    }
                                    localCurrencies
                                    roundingEnabled
                                }
                                webPresence {
                                    id
                                    domain {
                                        host
                                    }
                                    subfolderSuffix
                                    rootUrls {
                                        locale
                                        url
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
                    first: 5,
                    ...(cursor && { after: cursor })
                }
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'variables.after',
                cursor_path_in_response: 'data.markets.pageInfo.endCursor',
                response_path: 'data.markets.nodes',
                limit_name_in_request: 'variables.first',
                limit: 5,
                on_page: async ({ nextPageParam }) => {
                    cursor = typeof nextPageParam === 'string' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const markets = page.map((item: unknown) => {
                const parsed = ProviderMarketNodeSchema.safeParse(item);
                if (!parsed.success) {
                    throw new Error(`Failed to parse market node: ${parsed.error.message}`);
                }
                const node = parsed.data;

                return {
                    id: node.id,
                    name: node.name,
                    handle: node.handle,
                    ...(node.enabled != null && { enabled: node.enabled }),
                    ...(node.status != null && { status: node.status }),
                    ...(node.regions?.nodes != null && {
                        regions: node.regions.nodes.map((region) => ({
                            name: region.name,
                            ...(region.code != null && { code: region.code })
                        }))
                    }),
                    ...(node.currencySettings != null && {
                        currencySettings: {
                            ...(node.currencySettings.baseCurrency?.currencyCode != null && {
                                baseCurrencyCode: node.currencySettings.baseCurrency.currencyCode
                            }),
                            ...(node.currencySettings.localCurrencies != null && {
                                localCurrencies: node.currencySettings.localCurrencies
                            }),
                            ...(node.currencySettings.roundingEnabled != null && {
                                roundingEnabled: node.currencySettings.roundingEnabled
                            })
                        }
                    }),
                    ...(node.webPresence != null && {
                        webPresence: {
                            ...(node.webPresence.id != null && { id: node.webPresence.id }),
                            ...(node.webPresence.domain?.host != null && {
                                domain: node.webPresence.domain.host
                            }),
                            ...(node.webPresence.subfolderSuffix != null && {
                                subfolderSuffix: node.webPresence.subfolderSuffix
                            }),
                            ...(node.webPresence.rootUrls != null && {
                                rootUrls: node.webPresence.rootUrls.map((url) => ({
                                    locale: url.locale,
                                    url: url.url
                                }))
                            })
                        }
                    })
                };
            });

            if (markets.length > 0) {
                await nango.batchSave(markets, 'Market');
            }

            if (cursor !== undefined) {
                await nango.saveCheckpoint({ cursor });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Market');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
