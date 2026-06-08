import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ShopifyMoneyV2Schema = z.object({
    amount: z.string(),
    currencyCode: z.string()
});

const ShopifyCustomerSchema = z.object({
    id: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().optional()
});

const ShopifyGiftCardNodeSchema = z.object({
    id: z.string(),
    balance: ShopifyMoneyV2Schema,
    initialValue: ShopifyMoneyV2Schema,
    maskedCode: z.string(),
    customer: ShopifyCustomerSchema.nullish(),
    expiresOn: z.string().nullish(),
    createdAt: z.string()
});

const GiftCardSchema = z.object({
    id: z.string(),
    balance: z.object({
        amount: z.string(),
        currencyCode: z.string()
    }),
    initialValue: z.object({
        amount: z.string(),
        currencyCode: z.string()
    }),
    maskedCode: z.string(),
    customer: z
        .object({
            id: z.string().optional(),
            firstName: z.string().optional(),
            lastName: z.string().optional(),
            email: z.string().optional()
        })
        .optional(),
    expiresOn: z.string().optional(),
    createdAt: z.string()
});

const CheckpointSchema = z.object({
    cursor: z.string()
});

const sync = createSync({
    description: 'Sync Shopify gift cards with balance and customer data',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    // https://shopify.dev/docs/api/admin-graphql/latest/queries/giftCards
    endpoints: [{ method: 'GET', path: '/syncs/gift-cards' }],
    models: {
        GiftCard: GiftCardSchema
    },

    exec: async (nango) => {
        const checkpoint = CheckpointSchema.parse((await nango.getCheckpoint()) ?? { cursor: '' });
        let cursor = checkpoint.cursor || undefined;

        // Blocker: The giftCards query does not document an updated_at filter for
        // incremental change tracking, and there is no dedicated changed-records or
        // deleted-records endpoint for gift cards. The query returns the full dataset
        // with cursor pagination on every execution.
        await nango.trackDeletesStart('GiftCard');

        const proxyConfig: ProxyConfiguration = {
            // https://shopify.dev/docs/api/admin-graphql/latest/queries/giftCards
            endpoint: 'admin/api/2026-01/graphql.json',
            method: 'POST',
            data: {
                query: `
                    query GetGiftCards($first: Int!, $after: String, $query: String) {
                        giftCards(first: $first, after: $after, query: $query) {
                            nodes {
                                id
                                balance { amount currencyCode }
                                initialValue { amount currencyCode }
                                maskedCode
                                customer { id firstName lastName email }
                                expiresOn
                                createdAt
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
                cursor_path_in_response: 'data.giftCards.pageInfo.endCursor',
                response_path: 'data.giftCards.nodes',
                limit_name_in_request: 'variables.first',
                limit: 5,
                on_page: async ({ nextPageParam }) => {
                    cursor = typeof nextPageParam === 'string' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const nodes = z.array(ShopifyGiftCardNodeSchema).parse(page);

            const giftCards = nodes.map((node) => {
                const card: {
                    id: string;
                    balance: { amount: string; currencyCode: string };
                    initialValue: { amount: string; currencyCode: string };
                    maskedCode: string;
                    customer?: { id?: string; firstName?: string; lastName?: string; email?: string };
                    expiresOn?: string;
                    createdAt: string;
                } = {
                    id: node.id,
                    balance: node.balance,
                    initialValue: node.initialValue,
                    maskedCode: node.maskedCode,
                    createdAt: node.createdAt
                };

                if (node.customer != null) {
                    const customer: { id?: string; firstName?: string; lastName?: string; email?: string } = {};
                    if (node.customer.id != null) {
                        customer.id = node.customer.id;
                    }
                    if (node.customer.firstName != null) {
                        customer.firstName = node.customer.firstName;
                    }
                    if (node.customer.lastName != null) {
                        customer.lastName = node.customer.lastName;
                    }
                    if (node.customer.email != null) {
                        customer.email = node.customer.email;
                    }
                    if (Object.keys(customer).length > 0) {
                        card.customer = customer;
                    }
                }

                if (node.expiresOn != null) {
                    card.expiresOn = node.expiresOn;
                }

                return card;
            });

            if (giftCards.length > 0) {
                await nango.batchSave(giftCards, 'GiftCard');
            }

            if (cursor !== undefined) {
                await nango.saveCheckpoint({ cursor });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('GiftCard');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
