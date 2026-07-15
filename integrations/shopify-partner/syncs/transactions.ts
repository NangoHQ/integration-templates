import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const TransactionSchema = z.object({
    id: z.string(),
    createdAt: z.string(),
    type: z.string().optional(),
    appName: z.string().optional(),
    shopName: z.string().optional(),
    shopDomain: z.string().optional(),
    netAmount: z.string().optional(),
    netAmountCurrency: z.string().optional(),
    grossAmount: z.string().optional(),
    grossAmountCurrency: z.string().optional(),
    shopifyFee: z.string().optional(),
    shopifyFeeCurrency: z.string().optional(),
    category: z.string().optional()
});

const CheckpointSchema = z.object({
    cursor: z.string(),
    createdAtMin: z.string()
});

const MoneySchema = z
    .object({
        amount: z.string().optional().nullable(),
        currencyCode: z.string().optional().nullable()
    })
    .passthrough();

const ShopSchema = z
    .object({
        name: z.string().optional().nullable(),
        myshopifyDomain: z.string().optional().nullable()
    })
    .passthrough();

const AppSchema = z
    .object({
        name: z.string().optional().nullable()
    })
    .passthrough();

const TransactionNodeSchema = z
    .object({
        id: z.string(),
        createdAt: z.string(),
        __typename: z.string().optional(),
        netAmount: MoneySchema.nullable().optional(),
        grossAmount: MoneySchema.nullable().optional(),
        shopifyFee: MoneySchema.nullable().optional(),
        amount: MoneySchema.nullable().optional(),
        shop: ShopSchema.nullable().optional(),
        app: AppSchema.nullable().optional(),
        category: z.string().optional().nullable()
    })
    .passthrough();

const EdgeSchema = z.object({
    cursor: z.string().optional(),
    node: TransactionNodeSchema.nullable().optional()
});

const TransactionsResponseSchema = z.object({
    data: z.object({
        transactions: z.object({
            edges: z.array(EdgeSchema),
            pageInfo: z.object({
                hasNextPage: z.boolean()
            })
        })
    })
});

const sync = createSync({
    description: 'Sync Partner transactions.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Transaction: TransactionSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        // Keep the timestamp filter stable during pagination so a saved cursor
        // always matches the query window that produced it.
        const resumeCreatedAtMin = checkpoint?.['createdAtMin'] || undefined;
        let currentCursor = checkpoint?.['cursor'] || undefined;
        let maxCreatedAtSeen = resumeCreatedAtMin;
        let hasNextPage = true;

        const transactionQuery = `query transactions($first: Int!, $after: String, $createdAtMin: DateTime) {
            transactions(first: $first, after: $after, createdAtMin: $createdAtMin) {
                edges {
                    node {
                        id
                        createdAt
                        __typename
                        ... on AppSubscriptionSale {
                            netAmount { amount currencyCode }
                            grossAmount { amount currencyCode }
                            shopifyFee { amount currencyCode }
                            shop { name myshopifyDomain }
                            app { name }
                        }
                        ... on AppOneTimeSale {
                            netAmount { amount currencyCode }
                            grossAmount { amount currencyCode }
                            shopifyFee { amount currencyCode }
                            shop { name myshopifyDomain }
                            app { name }
                        }
                        ... on AppSaleAdjustment {
                            netAmount { amount currencyCode }
                            grossAmount { amount currencyCode }
                            shopifyFee { amount currencyCode }
                            shop { name myshopifyDomain }
                            app { name }
                        }
                        ... on AppSaleCredit {
                            netAmount { amount currencyCode }
                            grossAmount { amount currencyCode }
                            shopifyFee { amount currencyCode }
                            shop { name myshopifyDomain }
                            app { name }
                        }
                        ... on AppUsageSale {
                            netAmount { amount currencyCode }
                            grossAmount { amount currencyCode }
                            shopifyFee { amount currencyCode }
                            shop { name myshopifyDomain }
                            app { name }
                        }
                        ... on ServiceSale {
                            netAmount { amount currencyCode }
                            grossAmount { amount currencyCode }
                            shopifyFee { amount currencyCode }
                            shop { name myshopifyDomain }
                        }
                        ... on ServiceSaleAdjustment {
                            netAmount { amount currencyCode }
                            grossAmount { amount currencyCode }
                            shopifyFee { amount currencyCode }
                            shop { name myshopifyDomain }
                        }
                        ... on ThemeSale {
                            netAmount { amount currencyCode }
                            grossAmount { amount currencyCode }
                            shopifyFee { amount currencyCode }
                            shop { name myshopifyDomain }
                        }
                        ... on ThemeSaleAdjustment {
                            netAmount { amount currencyCode }
                            grossAmount { amount currencyCode }
                            shopifyFee { amount currencyCode }
                            shop { name myshopifyDomain }
                        }
                        ... on LegacyTransaction {
                            amount { amount currencyCode }
                            shop { name myshopifyDomain }
                        }
                        ... on ReferralTransaction {
                            amount { amount currencyCode }
                            category
                            shop { name myshopifyDomain }
                        }
                        ... on ReferralAdjustment {
                            amount { amount currencyCode }
                            category
                            shop { name myshopifyDomain }
                        }
                        ... on TaxTransaction {
                            amount { amount currencyCode }
                        }
                    }
                    cursor
                }
                pageInfo {
                    hasNextPage
                }
            }
        }`;

        while (hasNextPage) {
            const proxyConfig: ProxyConfiguration = {
                // https://shopify.dev/docs/api/partner/latest/queries/transactions
                endpoint: '2026-07/graphql.json',
                method: 'POST',
                data: {
                    query: transactionQuery,
                    variables: {
                        first: 5,
                        after: currentCursor ?? null,
                        createdAtMin: resumeCreatedAtMin ?? null
                    }
                },
                retries: 3
            };

            const response = await nango.post(proxyConfig);
            const parsedResponse = TransactionsResponseSchema.safeParse(response.data);
            if (!parsedResponse.success) {
                throw new Error('Failed to parse transactions response: ' + parsedResponse.error.message);
            }

            const edges = parsedResponse.data.data.transactions.edges;
            hasNextPage = parsedResponse.data.data.transactions.pageInfo.hasNextPage;

            const transactions = edges.flatMap((edge) => {
                return edge.node ? [edge.node] : [];
            });

            if (transactions.length > 0) {
                const mappedTransactions = transactions.map((transaction) => {
                    const money = transaction.netAmount ?? transaction.amount;

                    if (!maxCreatedAtSeen || transaction.createdAt > maxCreatedAtSeen) {
                        maxCreatedAtSeen = transaction.createdAt;
                    }

                    return {
                        id: transaction.id,
                        createdAt: transaction.createdAt,
                        type: transaction.__typename,
                        appName: transaction.app?.name ?? undefined,
                        shopName: transaction.shop?.name ?? undefined,
                        shopDomain: transaction.shop?.myshopifyDomain ?? undefined,
                        netAmount: money?.amount ?? undefined,
                        netAmountCurrency: money?.currencyCode ?? undefined,
                        grossAmount: transaction.grossAmount?.amount ?? undefined,
                        grossAmountCurrency: transaction.grossAmount?.currencyCode ?? undefined,
                        shopifyFee: transaction.shopifyFee?.amount ?? undefined,
                        shopifyFeeCurrency: transaction.shopifyFee?.currencyCode ?? undefined,
                        category: transaction.category ?? undefined
                    };
                });

                await nango.batchSave(mappedTransactions, 'Transaction');
            }

            const lastEdge = edges[edges.length - 1];
            if (hasNextPage) {
                currentCursor = lastEdge?.cursor;
                if (!currentCursor) {
                    throw new Error('hasNextPage is true but cursor is missing');
                }
            } else {
                currentCursor = undefined;
            }

            if (hasNextPage) {
                await nango.saveCheckpoint({
                    cursor: currentCursor ?? '',
                    createdAtMin: resumeCreatedAtMin ?? ''
                });
            }
        }

        if (maxCreatedAtSeen) {
            await nango.saveCheckpoint({
                cursor: '',
                createdAtMin: maxCreatedAtSeen
            });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
