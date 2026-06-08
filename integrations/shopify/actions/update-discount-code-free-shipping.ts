import { z } from 'zod';
import { createAction } from 'nango';

const DiscountMinimumSubtotalInputSchema = z.object({
    greaterThanOrEqualToSubtotal: z.number().nullable().optional()
});

const DiscountMinimumQuantityInputSchema = z.object({
    greaterThanOrEqualToQuantity: z.number().nullable().optional()
});

const DiscountMinimumRequirementInputSchema = z.object({
    subtotal: DiscountMinimumSubtotalInputSchema.optional(),
    quantity: DiscountMinimumQuantityInputSchema.optional()
});

const DiscountCustomersInputSchema = z.object({
    add: z.array(z.string()).optional(),
    remove: z.array(z.string()).optional()
});

const DiscountCustomerSegmentsInputSchema = z.object({
    add: z.array(z.string()).optional(),
    remove: z.array(z.string()).optional()
});

const DiscountContextInputSchema = z.object({
    all: z.string().optional(),
    customers: DiscountCustomersInputSchema.optional(),
    customerSegments: DiscountCustomerSegmentsInputSchema.optional()
});

const DiscountCountriesInputSchema = z.object({
    add: z.array(z.string()).optional(),
    includeRestOfWorld: z.boolean().optional(),
    remove: z.array(z.string()).optional()
});

const DiscountShippingDestinationSelectionInputSchema = z.object({
    all: z.boolean().optional(),
    countries: DiscountCountriesInputSchema.optional()
});

const DiscountCombinesWithInputSchema = z.object({
    orderDiscounts: z.boolean().optional(),
    productDiscounts: z.boolean().optional(),
    shippingDiscounts: z.boolean().optional()
});

const DiscountCustomerSelectionInputSchema = z.object({
    all: z.string().optional(),
    customers: DiscountCustomersInputSchema.optional(),
    customerSegments: DiscountCustomerSegmentsInputSchema.optional()
});

const DiscountCodeFreeShippingInputSchema = z.object({
    appliesOncePerCustomer: z.boolean().optional(),
    appliesOnOneTimePurchase: z.boolean().optional(),
    appliesOnSubscription: z.boolean().optional(),
    code: z.string().optional(),
    combinesWith: DiscountCombinesWithInputSchema.optional(),
    context: DiscountContextInputSchema.optional(),
    customerSelection: DiscountCustomerSelectionInputSchema.optional(),
    destination: DiscountShippingDestinationSelectionInputSchema.optional(),
    endsAt: z.string().nullable().optional(),
    maximumShippingPrice: z.number().nullable().optional(),
    minimumRequirement: DiscountMinimumRequirementInputSchema.optional(),
    recurringCycleLimit: z.number().nullable().optional(),
    startsAt: z.string().optional(),
    tags: z.array(z.string()).optional(),
    title: z.string().optional(),
    usageLimit: z.number().nullable().optional()
});

const InputSchema = z.object({
    id: z.string().describe('The ID of the discount code to update. Example: gid://shopify/DiscountCodeNode/123456789'),
    freeShippingCodeDiscount: DiscountCodeFreeShippingInputSchema
});

const DiscountUserErrorSchema = z.object({
    field: z.array(z.string()).optional(),
    code: z.string().nullable().optional(),
    message: z.string()
});

const CodeDiscountNodeSchema = z
    .object({
        id: z.string(),
        codeDiscount: z.unknown().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    codeDiscountNode: CodeDiscountNodeSchema.nullable().optional(),
    userErrors: z.array(DiscountUserErrorSchema)
});

const action = createAction({
    description: 'Update a free shipping code discount in Shopify.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-discount-code-free-shipping',
        group: 'Discounts'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_discounts'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://shopify.dev/docs/api/admin-graphql/latest/mutations/discountCodeFreeShippingUpdate
            endpoint: '/admin/api/2026-04/graphql.json',
            data: {
                query: `
                    mutation discountCodeFreeShippingUpdate($freeShippingCodeDiscount: DiscountCodeFreeShippingInput!, $id: ID!) {
                        discountCodeFreeShippingUpdate(freeShippingCodeDiscount: $freeShippingCodeDiscount, id: $id) {
                            codeDiscountNode {
                                id
                                codeDiscount {
                                    ... on DiscountCodeFreeShipping {
                                        title
                                        startsAt
                                        endsAt
                                        codes(first: 1) {
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
                    id: input.id,
                    freeShippingCodeDiscount: input.freeShippingCodeDiscount
                }
            },
            retries: 3
        });

        const graphqlResponse = z
            .object({
                data: z.unknown().optional(),
                errors: z.array(z.unknown()).optional()
            })
            .parse(response.data);

        if (graphqlResponse.errors && graphqlResponse.errors.length > 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'GraphQL error from Shopify',
                errors: graphqlResponse.errors
            });
        }

        const payload = z
            .object({
                discountCodeFreeShippingUpdate: z
                    .object({
                        codeDiscountNode: CodeDiscountNodeSchema.nullable().optional(),
                        userErrors: z.array(DiscountUserErrorSchema)
                    })
                    .optional()
            })
            .optional()
            .parse(graphqlResponse.data);

        if (!payload) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Unexpected response from Shopify'
            });
        }

        const result = payload.discountCodeFreeShippingUpdate;

        if (!result) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Unexpected response from Shopify'
            });
        }

        return {
            codeDiscountNode: result.codeDiscountNode,
            userErrors: result.userErrors
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
