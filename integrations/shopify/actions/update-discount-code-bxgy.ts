import { z } from 'zod';
import { createAction } from 'nango';

const BxgyCodeDiscountInputSchema = z
    .object({})
    .passthrough()
    .describe('The input data used to update the BXGY code discount. Mirrors Shopify DiscountCodeBxgyInput.');

const InputSchema = z.object({
    id: z.string().describe('The ID of the BXGY code discount to update. Example: "gid://shopify/DiscountCodeNode/123"'),
    bxgyCodeDiscount: BxgyCodeDiscountInputSchema
});

const UserErrorSchema = z.object({
    field: z.array(z.string()).optional(),
    code: z.string().optional(),
    message: z.string(),
    extraInfo: z.string().optional()
});

const GraphQLResponseSchema = z.object({
    data: z
        .object({
            discountCodeBxgyUpdate: z
                .object({
                    codeDiscountNode: z.object({}).passthrough().optional(),
                    userErrors: z.array(UserErrorSchema).optional()
                })
                .optional()
        })
        .optional(),
    errors: z.array(z.object({ message: z.string() })).optional()
});

const OutputSchema = z.object({
    codeDiscountNode: z.object({}).passthrough().optional(),
    userErrors: z.array(UserErrorSchema)
});

const action = createAction({
    description: 'Update a buy X get Y code discount in Shopify.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-discount-code-bxgy',
        group: 'Discounts'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_discounts'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://shopify.dev/docs/api/admin-graphql/2026-04/mutations/discountCodeBxgyUpdate
        const response = await nango.post({
            endpoint: '/admin/api/2026-04/graphql.json',
            data: {
                query: `
                    mutation discountCodeBxgyUpdate($id: ID!, $bxgyCodeDiscount: DiscountCodeBxgyInput!) {
                        discountCodeBxgyUpdate(id: $id, bxgyCodeDiscount: $bxgyCodeDiscount) {
                            codeDiscountNode {
                                id
                                codeDiscount {
                                    ... on DiscountCodeBxgy {
                                        title
                                        status
                                        startsAt
                                        endsAt
                                        summary
                                        tags
                                        usageLimit
                                        usesPerOrderLimit
                                        appliesOncePerCustomer
                                        createdAt
                                        updatedAt
                                        customerBuys {
                                            value {
                                                ... on DiscountQuantity {
                                                    quantity
                                                }
                                            }
                                            items {
                                                ... on DiscountProducts {
                                                    products(first: 5) {
                                                        nodes {
                                                            id
                                                        }
                                                    }
                                                    productVariants(first: 5) {
                                                        nodes {
                                                            id
                                                        }
                                                    }
                                                }
                                                ... on DiscountCollections {
                                                    collections(first: 5) {
                                                        nodes {
                                                            id
                                                        }
                                                    }
                                                }
                                                ... on AllDiscountItems {
                                                    allItems
                                                }
                                            }
                                        }
                                        customerGets {
                                            value {
                                                ... on DiscountOnQuantity {
                                                    effect {
                                                        ... on DiscountPercentage {
                                                            percentage
                                                        }
                                                        ... on DiscountAmount {
                                                            amount {
                                                                amount
                                                                currencyCode
                                                            }
                                                        }
                                                    }
                                                    quantity {
                                                        quantity
                                                    }
                                                }
                                            }
                                            items {
                                                ... on DiscountProducts {
                                                    products(first: 5) {
                                                        nodes {
                                                            id
                                                        }
                                                    }
                                                    productVariants(first: 5) {
                                                        nodes {
                                                            id
                                                        }
                                                    }
                                                }
                                                ... on DiscountCollections {
                                                    collections(first: 5) {
                                                        nodes {
                                                            id
                                                        }
                                                    }
                                                }
                                                ... on AllDiscountItems {
                                                    allItems
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                            userErrors {
                                field
                                code
                                message
                                extraInfo
                            }
                        }
                    }
                `,
                variables: {
                    id: input.id,
                    bxgyCodeDiscount: input.bxgyCodeDiscount
                }
            },
            retries: 3
        });

        const parsed = GraphQLResponseSchema.safeParse(response.data);

        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'parse_error',
                message: 'Failed to parse Shopify GraphQL response.',
                details: parsed.error.message
            });
        }

        const body = parsed.data;

        if (body.errors && body.errors.length > 0) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: body.errors[0]?.message ?? 'Unknown GraphQL error'
            });
        }

        const result = body.data?.discountCodeBxgyUpdate;

        if (!result) {
            throw new nango.ActionError({
                type: 'missing_result',
                message: 'No result returned from Shopify.'
            });
        }

        const userErrors = result.userErrors || [];

        return {
            ...(result.codeDiscountNode !== undefined && { codeDiscountNode: result.codeDiscountNode }),
            userErrors
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
