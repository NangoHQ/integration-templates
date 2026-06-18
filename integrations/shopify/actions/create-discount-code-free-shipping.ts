import { z } from 'zod';
import { createAction } from 'nango';

const DiscountContextInputSchema = z
    .object({
        customerSegments: z
            .object({
                add: z.array(z.string())
            })
            .optional(),
        customers: z
            .object({
                add: z.array(z.string())
            })
            .optional(),
        all: z.string().optional()
    })
    .optional();

const DiscountShippingDestinationSelectionInputSchema = z
    .object({
        all: z.boolean().optional(),
        countries: z
            .object({
                add: z.array(z.string())
            })
            .optional()
    })
    .optional();

const DiscountMinimumRequirementInputSchema = z
    .object({
        subtotal: z
            .object({
                greaterThanOrEqualToSubtotal: z.number()
            })
            .optional(),
        quantity: z
            .object({
                greaterThanOrEqualToQuantity: z.number()
            })
            .optional()
    })
    .optional();

const DiscountCombinesWithInputSchema = z
    .object({
        productDiscounts: z.boolean().optional(),
        orderDiscounts: z.boolean().optional(),
        shippingDiscounts: z.boolean().optional()
    })
    .optional();

const InputSchema = z.object({
    code: z.string().describe('The code that customers use to apply the discount. Example: "FreeShipping"'),
    title: z.string().describe('The discount name that displays to merchants and customers. Example: "Free Shipping Promo"'),
    startsAt: z.string().describe('The date and time when the discount becomes active. Example: "2022-06-22T21:12:07.000Z"'),
    context: DiscountContextInputSchema,
    customerSelection: z.record(z.string(), z.unknown()).optional().describe('Deprecated. Use context instead.'),
    destination: DiscountShippingDestinationSelectionInputSchema,
    minimumRequirement: DiscountMinimumRequirementInputSchema,
    maximumShippingPrice: z.number().optional().describe('The maximum shipping price that qualifies for free shipping.'),
    endsAt: z.string().optional().describe('The date and time when the discount expires.'),
    appliesOncePerCustomer: z.boolean().optional(),
    appliesOnOneTimePurchase: z.boolean().optional(),
    appliesOnSubscription: z.boolean().optional(),
    combinesWith: DiscountCombinesWithInputSchema,
    recurringCycleLimit: z.number().optional(),
    tags: z.array(z.string()).optional(),
    usageLimit: z.number().optional()
});

const UserErrorSchema = z.object({
    field: z.array(z.string()).optional(),
    code: z.string().optional(),
    message: z.string()
});

const CodeDiscountNodeSchema = z.object({
    id: z.string(),
    codeDiscount: z.record(z.string(), z.unknown()).nullable().optional()
});

const OutputSchema = z.object({
    codeDiscountNode: CodeDiscountNodeSchema.nullable().optional(),
    userErrors: z.array(UserErrorSchema)
});

const GraphQLResponseSchema = z.object({
    data: z
        .object({
            discountCodeFreeShippingCreate: z
                .object({
                    codeDiscountNode: CodeDiscountNodeSchema.nullable().optional(),
                    userErrors: z.array(UserErrorSchema)
                })
                .optional()
        })
        .optional()
});

const action = createAction({
    description: 'Create a free shipping code discount in Shopify.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_discounts'],

    exec: async (nango, input) => {
        // https://shopify.dev/docs/api/admin-graphql/latest/mutations/discountCodeFreeShippingCreate
        const response = await nango.post({
            endpoint: '/admin/api/2026-04/graphql.json',
            data: {
                query: `
                    mutation discountCodeFreeShippingCreate($freeShippingCodeDiscount: DiscountCodeFreeShippingInput!) {
                        discountCodeFreeShippingCreate(freeShippingCodeDiscount: $freeShippingCodeDiscount) {
                            codeDiscountNode {
                                id
                                codeDiscount {
                                    ... on DiscountCodeFreeShipping {
                                        title
                                        startsAt
                                        endsAt
                                        maximumShippingPrice {
                                            amount
                                        }
                                        customerSelection {
                                            ... on DiscountCustomerAll {
                                                allCustomers
                                            }
                                        }
                                        destinationSelection {
                                            ... on DiscountCountryAll {
                                                allCountries
                                            }
                                        }
                                        minimumRequirement {
                                            ... on DiscountMinimumSubtotal {
                                                greaterThanOrEqualToSubtotal {
                                                    amount
                                                }
                                            }
                                        }
                                        codes(first: 10) {
                                            nodes {
                                                code
                                            }
                                        }
                                    }
                                }
                            }
                            userErrors {
                                field
                                code
                                message
                            }
                        }
                    }
                `,
                variables: {
                    freeShippingCodeDiscount: input
                }
            },
            retries: 3
        });

        const parsed = GraphQLResponseSchema.safeParse(response.data);

        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Shopify GraphQL API',
                details: parsed.error.message
            });
        }

        const payload = parsed.data.data?.discountCodeFreeShippingCreate;

        if (!payload) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Missing discountCodeFreeShippingCreate payload in Shopify response'
            });
        }

        return {
            codeDiscountNode: payload.codeDiscountNode,
            userErrors: payload.userErrors
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
