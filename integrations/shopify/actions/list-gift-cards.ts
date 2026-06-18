import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    first: z.number().int().min(1).max(250).optional().describe('The number of gift cards to return. Max 250.'),
    after: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    sortKey: z.enum(['CODE', 'CREATED_AT', 'CUSTOMER_NAME', 'ID', 'UPDATED_AT']).optional().describe('Sort key for the gift card list.'),
    reverse: z.boolean().optional().describe('Reverse the order of the results.'),
    query: z.string().optional().describe('Filter query string using Shopify search syntax.')
});

const MoneyV2Schema = z.object({
    amount: z.string(),
    currencyCode: z.string()
});

const GiftCardSchema = z.object({
    id: z.string(),
    balance: MoneyV2Schema,
    createdAt: z.string(),
    customer: z
        .object({
            id: z.string(),
            firstName: z.string().optional(),
            lastName: z.string().optional(),
            email: z.string().optional()
        })
        .optional(),
    deactivatedAt: z.string().optional(),
    enabled: z.boolean(),
    expiresOn: z.string().optional(),
    initialValue: MoneyV2Schema,
    lastCharacters: z.string(),
    maskedCode: z.string(),
    note: z.string().optional(),
    order: z
        .object({
            id: z.string()
        })
        .optional(),
    templateSuffix: z.string().optional(),
    updatedAt: z.string()
});

const OutputSchema = z.object({
    items: z.array(GiftCardSchema),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List Shopify gift cards with cursor pagination.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_gift_cards'],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const query = `
            query GiftCardList($first: Int, $after: String, $sortKey: GiftCardSortKeys, $reverse: Boolean, $query: String) {
                giftCards(first: $first, after: $after, sortKey: $sortKey, reverse: $reverse, query: $query) {
                    edges {
                        node {
                            id
                            balance {
                                amount
                                currencyCode
                            }
                            createdAt
                            customer {
                                id
                                firstName
                                lastName
                                email
                            }
                            deactivatedAt
                            enabled
                            expiresOn
                            initialValue {
                                amount
                                currencyCode
                            }
                            lastCharacters
                            maskedCode
                            note
                            order {
                                id
                            }
                            templateSuffix
                            updatedAt
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

        const variables: Record<string, unknown> = {
            first: input.first ?? 50,
            ...(input.after !== undefined && { after: input.after }),
            ...(input.sortKey !== undefined && { sortKey: input.sortKey }),
            ...(input.reverse !== undefined && { reverse: input.reverse }),
            ...(input.query !== undefined && { query: input.query })
        };

        const config: ProxyConfiguration = {
            // https://shopify.dev/docs/api/admin-graphql/2025-10/queries/giftCards
            endpoint: '/admin/api/2025-10/graphql.json',
            data: {
                query,
                variables
            },
            retries: 3
        };

        const response = await nango.post(config);

        if (!response.data) {
            throw new nango.ActionError({
                type: 'no_data',
                message: 'No data returned from Shopify gift cards query.'
            });
        }

        const GraphQLErrorSchema = z.object({
            message: z.string(),
            extensions: z.record(z.string(), z.unknown()).optional()
        });

        const GiftCardConnectionSchema = z.object({
            edges: z.array(
                z.object({
                    node: z.object({
                        id: z.string(),
                        balance: z.object({
                            amount: z.string(),
                            currencyCode: z.string()
                        }),
                        createdAt: z.string(),
                        customer: z
                            .object({
                                id: z.string(),
                                firstName: z.string().nullable(),
                                lastName: z.string().nullable(),
                                email: z.string().nullable()
                            })
                            .nullable()
                            .optional(),
                        deactivatedAt: z.string().nullable().optional(),
                        enabled: z.boolean(),
                        expiresOn: z.string().nullable().optional(),
                        initialValue: z.object({
                            amount: z.string(),
                            currencyCode: z.string()
                        }),
                        lastCharacters: z.string(),
                        maskedCode: z.string(),
                        note: z.string().nullable().optional(),
                        order: z
                            .object({
                                id: z.string()
                            })
                            .nullable()
                            .optional(),
                        templateSuffix: z.string().nullable().optional(),
                        updatedAt: z.string()
                    }),
                    cursor: z.string()
                })
            ),
            pageInfo: z.object({
                hasNextPage: z.boolean(),
                endCursor: z.string().nullable().optional()
            })
        });

        const ProviderResponseSchema = z.object({
            data: z
                .object({
                    giftCards: GiftCardConnectionSchema
                })
                .nullable()
                .optional(),
            errors: z.array(GraphQLErrorSchema).optional()
        });

        const result = ProviderResponseSchema.parse(response.data);

        if (result.errors && result.errors.length > 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: result.errors.map((e) => e.message).join('; ')
            });
        }

        if (!result.data || !result.data.giftCards) {
            throw new nango.ActionError({
                type: 'no_data',
                message: 'No gift card data returned from Shopify.'
            });
        }

        const items = result.data.giftCards.edges.map((edge) => {
            const node = edge.node;
            return {
                id: node.id,
                balance: node.balance,
                createdAt: node.createdAt,
                ...(node.customer != null && {
                    customer: {
                        id: node.customer.id,
                        ...(node.customer.firstName != null && { firstName: node.customer.firstName }),
                        ...(node.customer.lastName != null && { lastName: node.customer.lastName }),
                        ...(node.customer.email != null && { email: node.customer.email })
                    }
                }),
                ...(node.deactivatedAt != null && { deactivatedAt: node.deactivatedAt }),
                enabled: node.enabled,
                ...(node.expiresOn != null && { expiresOn: node.expiresOn }),
                initialValue: node.initialValue,
                lastCharacters: node.lastCharacters,
                maskedCode: node.maskedCode,
                ...(node.note != null && { note: node.note }),
                ...(node.order != null && { order: { id: node.order.id } }),
                ...(node.templateSuffix != null && { templateSuffix: node.templateSuffix }),
                updatedAt: node.updatedAt
            };
        });

        return {
            items,
            ...(result.data.giftCards.pageInfo.hasNextPage && result.data.giftCards.pageInfo.endCursor != null
                ? { nextCursor: result.data.giftCards.pageInfo.endCursor }
                : {})
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
