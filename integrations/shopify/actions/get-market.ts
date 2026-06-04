import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The GraphQL ID of the market. Example: "gid://shopify/Market/1"')
});

const CurrencySettingSchema = z.object({
    currencyCode: z.string(),
    currencyName: z.string(),
    enabled: z.boolean()
});

const MarketCurrencySettingsSchema = z.object({
    baseCurrency: CurrencySettingSchema.optional(),
    localCurrencies: z.boolean().optional(),
    roundingEnabled: z.boolean().optional()
});

const MarketRegionCountrySchema = z.object({
    id: z.string(),
    name: z.string(),
    code: z.string()
});

const MarketRegionsSchema = z.object({
    nodes: z.array(MarketRegionCountrySchema).optional()
});

const ShopLocaleSchema = z.object({
    locale: z.string().optional()
});

const DomainSchema = z.object({
    host: z.string().optional()
});

const RootUrlSchema = z.object({
    locale: z.string().optional(),
    url: z.string().optional()
});

const MarketWebPresenceSchema = z.object({
    id: z.string().optional(),
    domain: DomainSchema.optional(),
    subfolderSuffix: z.string().optional(),
    defaultLocale: ShopLocaleSchema.optional(),
    rootUrls: z.array(RootUrlSchema).optional()
});

const MarketSchema = z.object({
    name: z.string().optional(),
    handle: z.string().optional(),
    enabled: z.boolean().optional(),
    regions: MarketRegionsSchema.optional(),
    webPresence: MarketWebPresenceSchema.nullable().optional(),
    currencySettings: MarketCurrencySettingsSchema.nullable().optional()
});

const GraphQlResponseSchema = z.object({
    data: z
        .object({
            market: MarketSchema.nullable().optional()
        })
        .optional(),
    errors: z
        .array(
            z.object({
                message: z.string(),
                extensions: z.record(z.string(), z.unknown()).optional()
            })
        )
        .optional()
});

const OutputSchema = z.object({
    name: z.string().optional(),
    handle: z.string().optional(),
    enabled: z.boolean().optional(),
    regions: z.array(MarketRegionCountrySchema).optional(),
    webPresence: MarketWebPresenceSchema.optional(),
    currencySettings: MarketCurrencySettingsSchema.optional()
});

const action = createAction({
    description: 'Retrieve a Shopify market by GraphQL ID.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-market',
        group: 'Markets'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_markets'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const query = `
            query GetMarket($id: ID!) {
                market(id: $id) {
                    name
                    handle
                    enabled
                    regions(first: 100) {
                        nodes {
                            ... on MarketRegionCountry {
                                id
                                name
                                code
                            }
                        }
                    }
                    webPresence {
                        id
                        domain {
                            host
                        }
                        subfolderSuffix
                        defaultLocale {
                            locale
                        }
                        rootUrls {
                            locale
                            url
                        }
                    }
                    currencySettings {
                        baseCurrency {
                            currencyCode
                            currencyName
                            enabled
                        }
                        localCurrencies
                        roundingEnabled
                    }
                }
            }
        `;

        // https://shopify.dev/docs/api/admin-graphql/latest/queries/market
        const response = await nango.post({
            endpoint: '/admin/api/2026-04/graphql.json',
            data: {
                query,
                variables: {
                    id: input.id
                }
            },
            retries: 3
        });

        const parsed = GraphQlResponseSchema.parse(response.data);

        if (parsed.errors && parsed.errors.length > 0) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: parsed.errors.map((e) => e.message).join('; ')
            });
        }

        const market = parsed.data?.market;
        if (!market) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Market with id ${input.id} not found.`
            });
        }

        return {
            name: market.name,
            handle: market.handle,
            enabled: market.enabled,
            regions: market.regions?.nodes,
            ...(market.webPresence != null && { webPresence: market.webPresence }),
            ...(market.currencySettings != null && { currencySettings: market.currencySettings })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
