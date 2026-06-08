import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The globally-unique GraphQL ID of the return to retrieve. Example: "gid://shopify/Return/945000954"')
});

const ReturnLineItemSchema = z.object({
    id: z.string(),
    quantity: z.number(),
    returnReason: z.string().optional(),
    returnReasonNote: z.string().optional(),
    fulfillmentLineItem: z
        .object({
            lineItem: z
                .object({
                    name: z.string().optional()
                })
                .optional()
        })
        .optional()
});

const RefundSchema = z.object({
    id: z.string(),
    createdAt: z.string().optional(),
    totalRefundedSet: z
        .object({
            shopMoney: z
                .object({
                    amount: z.string().optional(),
                    currencyCode: z.string().optional()
                })
                .optional(),
            presentmentMoney: z
                .object({
                    amount: z.string().optional(),
                    currencyCode: z.string().optional()
                })
                .optional()
        })
        .optional()
});

const OrderSchema = z.object({
    id: z.string()
});

const ProviderReturnSchema = z.object({
    id: z.string(),
    status: z.string(),
    name: z.string().optional(),
    order: OrderSchema.optional(),
    returnLineItems: z
        .object({
            edges: z.array(
                z.object({
                    node: ReturnLineItemSchema
                })
            )
        })
        .optional(),
    refunds: z
        .object({
            edges: z.array(
                z.object({
                    node: RefundSchema
                })
            )
        })
        .optional()
});

const OutputSchema = z.object({
    id: z.string(),
    status: z.string(),
    name: z.string().optional(),
    order: OrderSchema.optional(),
    returnLineItems: z.array(ReturnLineItemSchema).optional(),
    refunds: z.array(RefundSchema).optional()
});

const GraphQLResponseSchema = z.object({
    data: z
        .object({
            return: ProviderReturnSchema.nullable().optional()
        })
        .optional(),
    errors: z.array(z.object({ message: z.string().optional() })).optional()
});

const action = createAction({
    description: 'Retrieve a Shopify return by GraphQL ID.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-return',
        group: 'Returns'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_returns'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://shopify.dev/docs/api/admin-graphql/2026-07/queries/return
        const response = await nango.post({
            endpoint: '/admin/api/2026-07/graphql.json',
            data: {
                query: `
                    query GetReturn($id: ID!) {
                        return(id: $id) {
                            id
                            status
                            name
                            order {
                                id
                            }
                            returnLineItems(first: 50) {
                                edges {
                                    node {
                                        ... on ReturnLineItem {
                                            id
                                            quantity
                                            returnReason
                                            returnReasonNote
                                        }
                                    }
                                }
                            }
                            refunds(first: 50) {
                                edges {
                                    node {
                                        id
                                        createdAt
                                        totalRefundedSet {
                                            shopMoney {
                                                amount
                                                currencyCode
                                            }
                                            presentmentMoney {
                                                amount
                                                currencyCode
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                `,
                variables: {
                    id: input.id
                }
            },
            retries: 3
        });

        const parsed = GraphQLResponseSchema.parse(response.data);

        let providerReturn = parsed.data?.return;

        if (!providerReturn) {
            const errors = parsed.errors;
            if (errors && errors.length > 0) {
                // https://shopify.dev/docs/api/admin-graphql/2026-07/queries/return
                const fallbackResponse = await nango.post({
                    endpoint: '/admin/api/2026-07/graphql.json',
                    data: {
                        query: `
                            query GetReturnFallback($id: ID!) {
                                return(id: $id) {
                                    id
                                    status
                                    name
                                    returnLineItems(first: 50) {
                                        edges {
                                            node {
                                                ... on ReturnLineItem {
                                                    id
                                                    quantity
                                                    returnReason
                                                    returnReasonNote
                                                }
                                            }
                                        }
                                    }
                                    refunds(first: 50) {
                                        edges {
                                            node {
                                                id
                                                createdAt
                                                totalRefundedSet {
                                                    shopMoney {
                                                        amount
                                                        currencyCode
                                                    }
                                                    presentmentMoney {
                                                        amount
                                                        currencyCode
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        `,
                        variables: {
                            id: input.id
                        }
                    },
                    retries: 3
                });

                const fallbackParsed = GraphQLResponseSchema.parse(fallbackResponse.data);

                const fallbackErrors = fallbackParsed.errors;
                if (fallbackErrors && fallbackErrors.length > 0) {
                    throw new nango.ActionError({
                        type: 'provider_error',
                        message: fallbackErrors[0]?.message || 'GraphQL error',
                        id: input.id
                    });
                }

                providerReturn = fallbackParsed.data?.return;
            }

            if (!providerReturn) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: 'Return not found',
                    id: input.id
                });
            }
        }

        return {
            id: providerReturn.id,
            status: providerReturn.status,
            ...(providerReturn.name != null && { name: providerReturn.name }),
            ...(providerReturn.order != null && { order: providerReturn.order }),
            ...(providerReturn.returnLineItems != null && {
                returnLineItems: providerReturn.returnLineItems.edges.map((edge) => edge.node)
            }),
            ...(providerReturn.refunds != null && {
                refunds: providerReturn.refunds.edges.map((edge) => edge.node)
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
