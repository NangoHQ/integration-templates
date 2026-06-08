import { z } from 'zod';
import { createAction } from 'nango';

const DiscountProductsInputSchema = z.object({
    productsToAdd: z.array(z.string()).optional(),
    productsToRemove: z.array(z.string()).optional(),
    productVariantsToAdd: z.array(z.string()).optional(),
    productVariantsToRemove: z.array(z.string()).optional()
});

const DiscountCollectionsInputSchema = z.object({
    add: z.array(z.string()).optional(),
    remove: z.array(z.string()).optional()
});

const DiscountItemsInputSchema = z.object({
    collections: DiscountCollectionsInputSchema.optional(),
    products: DiscountProductsInputSchema.optional()
});

const DiscountCustomerBuysValueInputSchema = z.object({
    quantity: z.string().describe('The quantity of prerequisite items. Example: "1"')
});

const DiscountCustomerBuysInputSchema = z.object({
    items: DiscountItemsInputSchema,
    value: DiscountCustomerBuysValueInputSchema,
    isOneTimePurchase: z.boolean().optional(),
    isSubscription: z.boolean().optional()
});

const DiscountEffectInputSchema = z.object({
    percentage: z.number().describe('The percentage value of the discount. Value must be between 0.00 - 1.00. Example: 1')
});

const DiscountOnQuantityInputSchema = z.object({
    effect: DiscountEffectInputSchema,
    quantity: z.string().describe('The quantity of items that are discounted. Example: "1"')
});

const DiscountCustomerGetsValueInputSchema = z.object({
    discountOnQuantity: DiscountOnQuantityInputSchema
});

const DiscountCustomerGetsInputSchema = z.object({
    items: DiscountItemsInputSchema,
    value: DiscountCustomerGetsValueInputSchema,
    appliesOnOneTimePurchase: z.boolean().optional(),
    appliesOnSubscription: z.boolean().optional()
});

const DiscountCombinesWithInputSchema = z.object({
    orderDiscounts: z.boolean().optional(),
    productDiscounts: z.boolean().optional(),
    shippingDiscounts: z.boolean().optional()
});

const DiscountContextInputSchema = z.object({
    all: z.boolean().optional(),
    customers: z
        .object({
            add: z.array(z.string()).optional(),
            remove: z.array(z.string()).optional()
        })
        .optional(),
    customerSegments: z
        .object({
            add: z.array(z.string()).optional(),
            remove: z.array(z.string()).optional()
        })
        .optional()
});

const InputSchema = z.object({
    title: z.string().describe('The discount name. Example: "Buy one, get one free"'),
    startsAt: z.string().describe('The date and time when the discount becomes active. Example: "2025-01-01T00:00:00Z"'),
    endsAt: z.string().optional().describe('The date and time when the discount expires. Example: "2025-12-31T23:59:59Z"'),
    customerBuys: DiscountCustomerBuysInputSchema,
    customerGets: DiscountCustomerGetsInputSchema,
    combinesWith: DiscountCombinesWithInputSchema.optional(),
    context: DiscountContextInputSchema.optional(),
    tags: z.array(z.string()).optional(),
    usesPerOrderLimit: z.string().optional().describe('The maximum number of times the discount can be applied to an order. Example: "1"')
});

const UserErrorSchema = z.object({
    field: z.array(z.string()).nullable().optional(),
    message: z.string(),
    code: z.string().optional()
});

const AutomaticDiscountSchema = z.object({
    id: z.string(),
    title: z.string().optional(),
    startsAt: z.string().optional(),
    endsAt: z.string().nullable().optional(),
    status: z.string().optional(),
    summary: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional()
});

const OutputSchema = z.object({
    automaticDiscountNode: AutomaticDiscountSchema.optional(),
    userErrors: z.array(UserErrorSchema)
});

const action = createAction({
    description: 'Create an automatic buy X get Y Shopify discount.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-automatic-discount-bxgy',
        group: 'Discounts'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_discounts'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const mutation = `
            mutation discountAutomaticBxgyCreate($automaticBxgyDiscount: DiscountAutomaticBxgyInput!) {
                discountAutomaticBxgyCreate(automaticBxgyDiscount: $automaticBxgyDiscount) {
                    automaticDiscountNode {
                        id
                        automaticDiscount {
                            ... on DiscountAutomaticBxgy {
                                title
                                startsAt
                                endsAt
                                status
                                summary
                                createdAt
                                updatedAt
                            }
                        }
                    }
                    userErrors {
                        field
                        message
                        code
                    }
                }
            }
        `;

        const variables = {
            automaticBxgyDiscount: {
                title: input.title,
                startsAt: input.startsAt,
                ...(input.endsAt !== undefined && { endsAt: input.endsAt }),
                customerBuys: {
                    items: input.customerBuys.items,
                    value: input.customerBuys.value,
                    ...(input.customerBuys.isOneTimePurchase !== undefined && { isOneTimePurchase: input.customerBuys.isOneTimePurchase }),
                    ...(input.customerBuys.isSubscription !== undefined && { isSubscription: input.customerBuys.isSubscription })
                },
                customerGets: {
                    items: input.customerGets.items,
                    value: input.customerGets.value,
                    ...(input.customerGets.appliesOnOneTimePurchase !== undefined && { appliesOnOneTimePurchase: input.customerGets.appliesOnOneTimePurchase }),
                    ...(input.customerGets.appliesOnSubscription !== undefined && { appliesOnSubscription: input.customerGets.appliesOnSubscription })
                },
                ...(input.combinesWith !== undefined && { combinesWith: input.combinesWith }),
                ...(input.context !== undefined && { context: input.context }),
                ...(input.tags !== undefined && { tags: input.tags }),
                ...(input.usesPerOrderLimit !== undefined && { usesPerOrderLimit: input.usesPerOrderLimit })
            }
        };

        // https://shopify.dev/docs/api/admin-graphql/2025-10/mutations/discountAutomaticBxgyCreate
        const response = await nango.post({
            endpoint: 'admin/api/2025-10/graphql.json',
            data: {
                query: mutation,
                variables: variables
            },
            retries: 3
        });

        const payload = z
            .object({
                errors: z.array(z.object({ message: z.string() })).optional(),
                data: z
                    .object({
                        discountAutomaticBxgyCreate: z
                            .object({
                                automaticDiscountNode: z
                                    .object({
                                        id: z.string(),
                                        automaticDiscount: z
                                            .object({
                                                title: z.string().nullable().optional(),
                                                startsAt: z.string().nullable().optional(),
                                                endsAt: z.string().nullable().optional(),
                                                status: z.string().nullable().optional(),
                                                summary: z.string().nullable().optional(),
                                                createdAt: z.string().nullable().optional(),
                                                updatedAt: z.string().nullable().optional()
                                            })
                                            .nullable()
                                            .optional()
                                    })
                                    .nullable()
                                    .optional(),
                                userErrors: z.array(
                                    z.object({
                                        field: z.array(z.string()).nullable().optional(),
                                        message: z.string(),
                                        code: z.string().nullable().optional()
                                    })
                                )
                            })
                            .nullable()
                            .optional()
                    })
                    .nullable()
                    .optional()
            })
            .safeParse(response.data);

        if (payload.success && payload.data.errors && payload.data.errors.length > 0) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: payload.data.errors.map((e) => e.message).join('; ')
            });
        }

        if (!payload.success || !payload.data.data || !payload.data.data.discountAutomaticBxgyCreate) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Shopify GraphQL API'
            });
        }

        const result = payload.data.data.discountAutomaticBxgyCreate;
        const node = result.automaticDiscountNode;
        const discount = node?.automaticDiscount;

        return {
            ...(node && {
                automaticDiscountNode: {
                    id: node.id,
                    ...(discount?.title != null && { title: discount.title }),
                    ...(discount?.startsAt != null && { startsAt: discount.startsAt }),
                    ...(discount?.endsAt != null && { endsAt: discount.endsAt }),
                    ...(discount?.status != null && { status: discount.status }),
                    ...(discount?.summary != null && { summary: discount.summary }),
                    ...(discount?.createdAt != null && { createdAt: discount.createdAt }),
                    ...(discount?.updatedAt != null && { updatedAt: discount.updatedAt })
                }
            }),
            userErrors: result.userErrors.map((error) => ({
                ...(error.field != null && { field: error.field }),
                message: error.message,
                ...(error.code != null && { code: error.code })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
