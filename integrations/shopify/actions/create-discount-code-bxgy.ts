import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const DiscountCollectionsInputSchema = z.object({
    add: z.array(z.string()).optional(),
    remove: z.array(z.string()).optional()
});

const DiscountProductsInputSchema = z.object({
    productsToAdd: z.array(z.string()).optional(),
    productsToRemove: z.array(z.string()).optional(),
    productVariantsToAdd: z.array(z.string()).optional(),
    productVariantsToRemove: z.array(z.string()).optional()
});

const DiscountItemsInputSchema = z.object({
    collections: DiscountCollectionsInputSchema.optional(),
    products: DiscountProductsInputSchema.optional()
});

const DiscountCustomerBuysValueInputSchema = z.object({
    amount: z.string().optional(),
    quantity: z.string().optional()
});

const DiscountEffectInputSchema = z.object({
    amount: z.string().optional(),
    percentage: z.number().optional()
});

const DiscountOnQuantityInputSchema = z.object({
    effect: DiscountEffectInputSchema.optional(),
    quantity: z.string().optional()
});

const DiscountCustomerGetsValueInputSchema = z.object({
    discountOnQuantity: DiscountOnQuantityInputSchema.optional()
});

const DiscountCustomerBuysInputSchema = z.object({
    isOneTimePurchase: z.boolean().optional(),
    isSubscription: z.boolean().optional(),
    items: DiscountItemsInputSchema.optional(),
    value: DiscountCustomerBuysValueInputSchema.optional()
});

const DiscountCustomerGetsInputSchema = z.object({
    appliesOnOneTimePurchase: z.boolean().optional(),
    appliesOnSubscription: z.boolean().optional(),
    items: DiscountItemsInputSchema.optional(),
    value: DiscountCustomerGetsValueInputSchema.optional()
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

const InputSchema = z.object({
    code: z.string().describe('The code that customers use to apply the discount.'),
    title: z.string().describe("The discount's name that displays to merchants and customers."),
    startsAt: z.string().describe('The date and time when the discount becomes active. Example: "2026-01-01T00:00:00Z"'),
    endsAt: z.string().nullable().optional().describe('The date and time when the discount expires.'),
    appliesOncePerCustomer: z.boolean().optional().describe('Whether a customer can only use the discount once.'),
    combinesWith: z.record(z.string(), z.unknown()).optional().describe('The discount classes that can combine with this discount.'),
    context: DiscountContextInputSchema.describe('The context defining which buyers can use the discount.'),
    customerBuys: DiscountCustomerBuysInputSchema.describe('The items eligible for the discount and the required quantity.'),
    customerGets: DiscountCustomerGetsInputSchema.describe('The items that qualify for the discount and the total value.'),
    tags: z.array(z.string()).optional().describe('Searchable keywords associated with the discount.'),
    usageLimit: z.number().optional().describe('The maximum number of times the discount can be redeemed.'),
    usesPerOrderLimit: z.number().optional().describe('The maximum number of times the discount can be applied to an order.')
});

const UserErrorSchema = z.object({
    field: z.array(z.string()).optional(),
    code: z.string().optional(),
    message: z.string().optional()
});

const CodeDiscountNodeSchema = z
    .object({
        id: z.string().optional(),
        codeDiscount: z.record(z.string(), z.unknown()).optional()
    })
    .nullable();

const OutputSchema = z.object({
    codeDiscountNode: CodeDiscountNodeSchema.optional(),
    userErrors: z.array(UserErrorSchema)
});

const action = createAction({
    description: 'Create a buy X get Y code discount in Shopify.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_discounts'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const mutation = `
            mutation discountCodeBxgyCreate($bxgyCodeDiscount: DiscountCodeBxgyInput!) {
                discountCodeBxgyCreate(bxgyCodeDiscount: $bxgyCodeDiscount) {
                    codeDiscountNode {
                        id
                        codeDiscount {
                            ... on DiscountCodeBxgy {
                                title
                                startsAt
                                endsAt
                                appliesOncePerCustomer
                                usesPerOrderLimit
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
        `;

        const variables = {
            bxgyCodeDiscount: {
                code: input.code,
                title: input.title,
                startsAt: input.startsAt,
                ...(input.endsAt !== undefined && { endsAt: input.endsAt }),
                ...(input.appliesOncePerCustomer !== undefined && { appliesOncePerCustomer: input.appliesOncePerCustomer }),
                ...(input.combinesWith !== undefined && { combinesWith: input.combinesWith }),
                context: input.context,
                customerBuys: input.customerBuys,
                customerGets: input.customerGets,
                ...(input.tags !== undefined && { tags: input.tags }),
                ...(input.usageLimit !== undefined && { usageLimit: input.usageLimit }),
                ...(input.usesPerOrderLimit !== undefined && { usesPerOrderLimit: input.usesPerOrderLimit })
            }
        };

        const config: ProxyConfiguration = {
            // https://shopify.dev/docs/api/admin-graphql/latest/mutations/discountCodeBxgyCreate
            endpoint: '/admin/api/2026-04/graphql.json',
            data: {
                query: mutation,
                variables
            },
            retries: 3
        };

        const response = await nango.post(config);

        const responseBody = z
            .object({
                data: z.unknown().optional()
            })
            .parse(response);

        const responseData = z
            .object({
                data: z.record(z.string(), z.unknown()).optional(),
                errors: z.array(z.record(z.string(), z.unknown())).optional()
            })
            .parse(responseBody.data || {});

        if (responseData.errors && responseData.errors.length > 0) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: responseData.errors
                    .map((e) => (typeof e === 'object' && e !== null && 'message' in e ? String(e['message']) : JSON.stringify(e)))
                    .join(', ')
            });
        }

        const payload = z
            .object({
                discountCodeBxgyCreate: z.record(z.string(), z.unknown()).optional()
            })
            .parse(responseData.data || {});

        const createPayload = z
            .object({
                codeDiscountNode: CodeDiscountNodeSchema.optional(),
                userErrors: z.array(UserErrorSchema).optional()
            })
            .parse(payload.discountCodeBxgyCreate || {});

        if (createPayload.userErrors && createPayload.userErrors.length > 0) {
            throw new nango.ActionError({
                type: 'creation_failed',
                message: createPayload.userErrors.map((e) => e.message).join(', '),
                userErrors: createPayload.userErrors
            });
        }

        return {
            codeDiscountNode: createPayload.codeDiscountNode,
            userErrors: createPayload.userErrors || []
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
