import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const TransactionTypeEnum = z.enum([
    'SERVICE_SALE',
    'SERVICE_SALE_ADJUSTMENT',
    'THEME_SALE',
    'THEME_SALE_ADJUSTMENT',
    'APP_ONE_TIME_SALE',
    'APP_SUBSCRIPTION_SALE',
    'APP_USAGE_SALE',
    'APP_SALE_CREDIT',
    'APP_SALE_ADJUSTMENT',
    'REFERRAL',
    'REFERRAL_ADJUSTMENT',
    'TAX',
    'LEGACY'
]);

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    first: z.number().optional().describe('Number of results to return. Defaults to 50.'),
    shopId: z.string().optional().describe('Shop GID filter. Example: gid://partners/Shop/123'),
    myshopifyDomain: z.string().optional().describe('Shop domain filter. Example: my-shop.myshopify.com'),
    appId: z.string().optional().describe('App GID filter. Example: gid://partners/App/123'),
    createdAtMin: z.string().optional().describe('Minimum created at timestamp (ISO 8601).'),
    createdAtMax: z.string().optional().describe('Maximum created at timestamp (ISO 8601).'),
    types: z.array(TransactionTypeEnum).optional().describe('Transaction types to filter by.')
});

const TransactionNodeSchema = z
    .object({
        __typename: z.string().optional(),
        id: z.string(),
        createdAt: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(TransactionNodeSchema),
    nextCursor: z.string().optional(),
    hasNextPage: z.boolean()
});

const GraphQLErrorSchema = z.object({
    message: z.string()
});

const GraphQLResponseSchema = z.object({
    data: z
        .object({
            transactions: z
                .object({
                    edges: z.array(
                        z.object({
                            cursor: z.string(),
                            node: TransactionNodeSchema
                        })
                    ),
                    pageInfo: z.object({
                        hasNextPage: z.boolean(),
                        hasPreviousPage: z.boolean().optional()
                    })
                })
                .optional()
                .nullable()
        })
        .optional()
        .nullable(),
    errors: z.array(GraphQLErrorSchema).optional()
});

const action = createAction({
    description: 'List Partner transactions with cursor pagination and filters.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const query = `
            fragment MoneyFields on Money {
                amount
                currencyCode
            }

            query Transactions($first: Int, $after: String, $shopId: ID, $myshopifyDomain: String, $appId: ID, $createdAtMin: DateTime, $createdAtMax: DateTime, $types: [TransactionType!]) {
                transactions(first: $first, after: $after, shopId: $shopId, myshopifyDomain: $myshopifyDomain, appId: $appId, createdAtMin: $createdAtMin, createdAtMax: $createdAtMax, types: $types) {
                    edges {
                        cursor
                        node {
                            __typename
                            id
                            createdAt
                            ... on AppOneTimeSale {
                                app { id name }
                                chargeId
                                grossAmount { ...MoneyFields }
                                netAmount { ...MoneyFields }
                                shop { id name myshopifyDomain }
                                shopifyFee { ...MoneyFields }
                            }
                            ... on AppSubscriptionSale {
                                app { id name }
                                billingInterval
                                chargeId
                                grossAmount { ...MoneyFields }
                                netAmount { ...MoneyFields }
                                shop { id name myshopifyDomain }
                                shopifyFee { ...MoneyFields }
                            }
                            ... on AppUsageSale {
                                app { id name }
                                chargeId
                                grossAmount { ...MoneyFields }
                                netAmount { ...MoneyFields }
                                shop { id name myshopifyDomain }
                                shopifyFee { ...MoneyFields }
                            }
                            ... on AppSaleCredit {
                                app { id name }
                                chargeId
                                grossAmount { ...MoneyFields }
                                netAmount { ...MoneyFields }
                                shop { id name myshopifyDomain }
                                shopifyFee { ...MoneyFields }
                            }
                            ... on AppSaleAdjustment {
                                app { id name }
                                chargeId
                                grossAmount { ...MoneyFields }
                                netAmount { ...MoneyFields }
                                shop { id name myshopifyDomain }
                                shopifyFee { ...MoneyFields }
                            }
                            ... on ServiceSale {
                                grossAmount { ...MoneyFields }
                                netAmount { ...MoneyFields }
                                shop { id name myshopifyDomain }
                                shopifyFee { ...MoneyFields }
                            }
                            ... on ServiceSaleAdjustment {
                                grossAmount { ...MoneyFields }
                                netAmount { ...MoneyFields }
                                shop { id name myshopifyDomain }
                                shopifyFee { ...MoneyFields }
                            }
                            ... on ThemeSale {
                                grossAmount { ...MoneyFields }
                                netAmount { ...MoneyFields }
                                shop { id name myshopifyDomain }
                                shopifyFee { ...MoneyFields }
                                theme { name }
                            }
                            ... on ThemeSaleAdjustment {
                                grossAmount { ...MoneyFields }
                                netAmount { ...MoneyFields }
                                shop { id name myshopifyDomain }
                                shopifyFee { ...MoneyFields }
                                theme { name }
                            }
                            ... on ReferralTransaction {
                                amount { ...MoneyFields }
                                category
                                shop { id name myshopifyDomain }
                            }
                            ... on ReferralAdjustment {
                                amount { ...MoneyFields }
                                category
                                shop { id name myshopifyDomain }
                            }
                            ... on TaxTransaction {
                                amount { ...MoneyFields }
                                type
                            }
                            ... on LegacyTransaction {
                                amount { ...MoneyFields }
                                shop { id name myshopifyDomain }
                            }
                        }
                    }
                    pageInfo {
                        hasNextPage
                        hasPreviousPage
                    }
                }
            }
        `;

        const variables = {
            first: input.first ?? 50,
            ...(input.cursor !== undefined && { after: input.cursor }),
            ...(input.shopId !== undefined && { shopId: input.shopId }),
            ...(input.myshopifyDomain !== undefined && { myshopifyDomain: input.myshopifyDomain }),
            ...(input.appId !== undefined && { appId: input.appId }),
            ...(input.createdAtMin !== undefined && { createdAtMin: input.createdAtMin }),
            ...(input.createdAtMax !== undefined && { createdAtMax: input.createdAtMax }),
            ...(input.types !== undefined && { types: input.types })
        };

        const config: ProxyConfiguration = {
            // https://shopify.dev/docs/api/partner/latest/queries/transactions
            endpoint: '2026-07/graphql.json',
            data: {
                query,
                variables
            },
            retries: 3
        };

        const response = await nango.post(config);

        const parsed = GraphQLResponseSchema.parse(response.data);

        if (parsed.errors && parsed.errors.length > 0) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: parsed.errors.map((e) => e.message).join(', ')
            });
        }

        const transactions = parsed.data?.transactions;
        if (!transactions) {
            return {
                items: [],
                hasNextPage: false
            };
        }

        const edges = transactions.edges;
        const lastEdge = edges[edges.length - 1];

        return {
            items: edges.map((edge) => edge.node),
            ...(lastEdge !== undefined && { nextCursor: lastEdge.cursor }),
            hasNextPage: transactions.pageInfo.hasNextPage
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
