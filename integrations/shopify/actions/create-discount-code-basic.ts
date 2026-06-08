import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const DiscountCombinesWithInputSchema = z
    .object({
        orderDiscounts: z.boolean().optional(),
        productDiscounts: z.boolean().optional(),
        shippingDiscounts: z.boolean().optional(),
        productDiscountsWithTagsOnSameCartLine: z.array(z.string()).optional()
    })
    .optional();

const DiscountContextInputSchema = z
    .object({
        all: z.literal('ALL').optional(),
        customers: z
            .object({
                add: z.array(z.string()).optional()
            })
            .optional(),
        customerSegments: z
            .object({
                add: z.array(z.string()).optional()
            })
            .optional(),
        markets: z
            .object({
                add: z.array(z.string()).optional()
            })
            .optional()
    })
    .optional();

const DiscountCustomerSelectionInputSchema = z
    .object({
        all: z.boolean().optional(),
        customers: z
            .object({
                add: z.array(z.string()).optional()
            })
            .optional()
    })
    .optional();

const DiscountCustomerGetsValueInputSchema = z.object({
    discountAmount: z
        .object({
            amount: z.union([z.string(), z.number()]),
            appliesOnEachItem: z.boolean().optional()
        })
        .optional(),
    percentage: z.number().optional()
});

const DiscountCustomerGetsItemsInputSchema = z.object({
    all: z.boolean().optional(),
    products: z
        .object({
            add: z.array(z.string()).optional()
        })
        .optional(),
    collections: z
        .object({
            add: z.array(z.string()).optional()
        })
        .optional()
});

const DiscountCustomerGetsInputSchema = z.object({
    value: DiscountCustomerGetsValueInputSchema,
    items: DiscountCustomerGetsItemsInputSchema
});

const DiscountMinimumRequirementInputSchema = z
    .object({
        quantity: z
            .object({
                greaterThanOrEqualToQuantity: z.string()
            })
            .optional(),
        subtotal: z
            .object({
                greaterThanOrEqualToSubtotal: z.string()
            })
            .optional()
    })
    .optional();

const InputSchema = z.object({
    title: z.string().describe('The discount name that displays to merchants in the Shopify admin and to customers.'),
    code: z.string().describe('The code that customers use to apply the discount.'),
    startsAt: z.string().describe('The date and time when the discount becomes active. ISO 8601 format.'),
    endsAt: z.string().nullable().optional().describe('The date and time when the discount expires. For no expiration, use null or omit.'),
    context: DiscountContextInputSchema.describe('The context defining which buyers can use the discount. Required unless using deprecated customerSelection.'),
    customerSelection: DiscountCustomerSelectionInputSchema.describe('Deprecated. Use context instead.'),
    customerGets: DiscountCustomerGetsInputSchema.describe('The items that qualify for the discount and the total value of the discount.'),
    appliesOncePerCustomer: z.boolean().optional().describe('Whether a customer can only use the discount once.'),
    combinesWith: DiscountCombinesWithInputSchema,
    minimumRequirement: DiscountMinimumRequirementInputSchema,
    recurringCycleLimit: z.number().optional().describe('The number of billing cycles for subscription-based discounts. 0 means indefinitely.'),
    tags: z.array(z.string()).optional().describe('Searchable keywords associated with the discount.'),
    usageLimit: z.number().nullable().optional().describe('The maximum number of times the discount can be redeemed. Null for unlimited.')
});

const OutputSchema = z.object({
    id: z.string(),
    codeDiscount: z
        .object({
            title: z.string().optional(),
            codes: z
                .object({
                    nodes: z.array(
                        z.object({
                            code: z.string()
                        })
                    )
                })
                .optional(),
            startsAt: z.string().optional(),
            endsAt: z.string().nullable().optional(),
            appliesOncePerCustomer: z.boolean().nullable().optional()
        })
        .nullable()
        .optional()
});

const GraphQLResponseSchema = z.object({
    data: z
        .object({
            discountCodeBasicCreate: z
                .object({
                    codeDiscountNode: OutputSchema.nullable().optional(),
                    userErrors: z.array(
                        z.object({
                            field: z.array(z.string()).optional(),
                            message: z.string()
                        })
                    )
                })
                .optional()
        })
        .optional(),
    errors: z
        .array(
            z.object({
                message: z.string()
            })
        )
        .optional()
});

const action = createAction({
    description: 'Create a basic code discount in Shopify.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-discount-code-basic'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_discounts'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const query = `
            mutation CreateDiscountCodeBasic($basicCodeDiscount: DiscountCodeBasicInput!) {
                discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {
                    codeDiscountNode {
                        id
                        codeDiscount {
                            ... on DiscountCodeBasic {
                                title
                                codes(first: 10) {
                                    nodes {
                                        code
                                    }
                                }
                                startsAt
                                endsAt
                                appliesOncePerCustomer
                            }
                        }
                    }
                    userErrors {
                        field
                        message
                    }
                }
            }
        `;

        const variables = {
            basicCodeDiscount: input
        };

        const config: ProxyConfiguration = {
            // https://shopify.dev/docs/api/admin-graphql/latest/mutations/discountCodeBasicCreate
            endpoint: '/admin/api/2026-04/graphql.json',
            data: {
                query,
                variables
            },
            retries: 3
        };

        const response = await nango.post(config);
        const body = GraphQLResponseSchema.parse(response.data);

        if (body.errors && body.errors.length > 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: body.errors.map((e) => e.message).join('; ')
            });
        }

        const createPayload = body.data?.discountCodeBasicCreate;
        if (!createPayload) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Unexpected response from Shopify: missing discountCodeBasicCreate payload.'
            });
        }

        if (createPayload.userErrors && createPayload.userErrors.length > 0) {
            throw new nango.ActionError({
                type: 'validation_error',
                message: createPayload.userErrors.map((e) => `${e.field ? e.field.join('.') : 'generic'}: ${e.message}`).join('; ')
            });
        }

        if (!createPayload.codeDiscountNode) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Discount code node not returned from Shopify.'
            });
        }

        return createPayload.codeDiscountNode;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
