import { z } from 'zod';
import { createAction } from 'nango';

const DiscountMinimumRequirementInputSchema = z.object({
    quantity: z
        .object({
            greaterThanOrEqualToQuantity: z.number().nullable().optional()
        })
        .nullable()
        .optional(),
    subtotal: z
        .object({
            greaterThanOrEqualToSubtotal: z.number().nullable().optional()
        })
        .nullable()
        .optional()
});

const DiscountCombinesWithInputSchema = z.object({
    orderDiscounts: z.boolean().optional(),
    productDiscounts: z.boolean().optional(),
    shippingDiscounts: z.boolean().optional(),
    productDiscountsWithTagsOnSameCartLine: z.array(z.object({ tag: z.string() })).optional()
});

const DiscountCustomerSegmentsInputSchema = z.object({
    add: z.array(z.string()).optional(),
    remove: z.array(z.string()).optional()
});

const DiscountCustomersInputSchema = z.object({
    add: z.array(z.string()).optional(),
    remove: z.array(z.string()).optional()
});

const DiscountContextInputSchema = z.object({
    customerSegments: DiscountCustomerSegmentsInputSchema.optional(),
    customers: DiscountCustomersInputSchema.optional(),
    all: z.string().optional()
});

const DiscountItemsInputProductsSchema = z.object({
    productsToAdd: z.array(z.string()).optional(),
    productsToRemove: z.array(z.string()).optional()
});

const DiscountItemsInputCollectionsSchema = z.object({
    collectionsToAdd: z.array(z.string()).optional(),
    collectionsToRemove: z.array(z.string()).optional()
});

const DiscountItemsInputVariantsSchema = z.object({
    variantsToAdd: z.array(z.string()).optional(),
    variantsToRemove: z.array(z.string()).optional()
});

const DiscountItemsInputSchema = z.object({
    all: z.boolean().optional(),
    products: DiscountItemsInputProductsSchema.optional(),
    collections: DiscountItemsInputCollectionsSchema.optional(),
    variants: DiscountItemsInputVariantsSchema.optional()
});

const DiscountCustomerGetsValueInputSchema = z.object({
    percentage: z.number().optional(),
    fixedAmount: z.number().optional()
});

const DiscountCustomerGetsInputSchema = z.object({
    items: DiscountItemsInputSchema.optional(),
    value: DiscountCustomerGetsValueInputSchema.optional()
});

const DiscountCodeBasicInputSchema = z.object({
    appliesOncePerCustomer: z.boolean().optional(),
    code: z.string().optional(),
    combinesWith: DiscountCombinesWithInputSchema.optional(),
    context: DiscountContextInputSchema.optional(),
    customerGets: DiscountCustomerGetsInputSchema.optional(),
    endsAt: z.string().nullable().optional(),
    minimumRequirement: DiscountMinimumRequirementInputSchema.optional(),
    recurringCycleLimit: z.number().optional(),
    startsAt: z.string().optional(),
    tags: z.array(z.string()).optional(),
    title: z.string().optional(),
    usageLimit: z.number().nullable().optional()
});

const InputSchema = z.object({
    id: z.string().describe('The ID of the discount code node to update. Example: "gid://shopify/DiscountCodeNode/123"'),
    basicCodeDiscount: DiscountCodeBasicInputSchema
});

const ProviderDiscountUserErrorSchema = z.object({
    code: z.string().nullable().optional(),
    extraInfo: z.string().nullable().optional(),
    field: z.array(z.string()).nullable().optional(),
    message: z.string()
});

const ProviderCodeDiscountFragmentSchema = z.object({
    title: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
    startsAt: z.string().nullable().optional(),
    endsAt: z.string().nullable().optional(),
    usageLimit: z.number().nullable().optional(),
    appliesOncePerCustomer: z.boolean().nullable().optional(),
    recurringCycleLimit: z.number().nullable().optional()
});

const ProviderCodeDiscountNodeSchema = z.object({
    id: z.string(),
    codeDiscount: ProviderCodeDiscountFragmentSchema.nullable().optional()
});

const ProviderResponseSchema = z.object({
    data: z.object({
        discountCodeBasicUpdate: z.object({
            codeDiscountNode: ProviderCodeDiscountNodeSchema.nullable().optional(),
            userErrors: z.array(ProviderDiscountUserErrorSchema)
        })
    })
});

const OutputCodeDiscountSchema = z.object({
    title: z.string().optional(),
    status: z.string().optional(),
    startsAt: z.string().optional(),
    endsAt: z.string().optional(),
    usageLimit: z.number().optional(),
    appliesOncePerCustomer: z.boolean().optional(),
    recurringCycleLimit: z.number().optional()
});

const CodeDiscountNodeSchema = z.object({
    id: z.string(),
    codeDiscount: OutputCodeDiscountSchema.optional()
});

const UserErrorSchema = z.object({
    code: z.string().optional(),
    extraInfo: z.string().optional(),
    field: z.array(z.string()).optional(),
    message: z.string()
});

const OutputSchema = z.object({
    codeDiscountNode: CodeDiscountNodeSchema.optional(),
    userErrors: z.array(UserErrorSchema)
});

const action = createAction({
    description: 'Update a basic code discount in Shopify.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-discount-code-basic',
        group: 'Discounts'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_discounts', 'read_discounts'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const query = `
            mutation discountCodeBasicUpdate($id: ID!, $basicCodeDiscount: DiscountCodeBasicInput!) {
                discountCodeBasicUpdate(id: $id, basicCodeDiscount: $basicCodeDiscount) {
                    codeDiscountNode {
                        id
                        codeDiscount {
                            ... on DiscountCodeBasic {
                                title
                                status
                                startsAt
                                endsAt
                                usageLimit
                                appliesOncePerCustomer
                                recurringCycleLimit
                            }
                        }
                    }
                    userErrors {
                        field
                        code
                        extraInfo
                        message
                    }
                }
            }
        `;

        const response = await nango.post({
            // https://shopify.dev/docs/api/admin-graphql/2026-04/mutations/discountCodeBasicUpdate
            endpoint: '/admin/api/2026-04/graphql.json',
            data: {
                query,
                variables: {
                    id: input.id,
                    basicCodeDiscount: input.basicCodeDiscount
                }
            },
            retries: 10
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const result = providerResponse.data.discountCodeBasicUpdate;

        const node = result.codeDiscountNode;
        const codeDiscount = node?.codeDiscount;

        return {
            ...(node && {
                codeDiscountNode: {
                    id: node.id,
                    ...(codeDiscount && {
                        codeDiscount: {
                            ...(codeDiscount.title != null && { title: codeDiscount.title }),
                            ...(codeDiscount.status != null && { status: codeDiscount.status }),
                            ...(codeDiscount.startsAt != null && { startsAt: codeDiscount.startsAt }),
                            ...(codeDiscount.endsAt != null && { endsAt: codeDiscount.endsAt }),
                            ...(codeDiscount.usageLimit != null && { usageLimit: codeDiscount.usageLimit }),
                            ...(codeDiscount.appliesOncePerCustomer != null && {
                                appliesOncePerCustomer: codeDiscount.appliesOncePerCustomer
                            }),
                            ...(codeDiscount.recurringCycleLimit != null && {
                                recurringCycleLimit: codeDiscount.recurringCycleLimit
                            })
                        }
                    })
                }
            }),
            userErrors: result.userErrors.map((error) => ({
                ...(error.code != null && { code: error.code }),
                ...(error.extraInfo != null && { extraInfo: error.extraInfo }),
                ...(error.field != null && { field: error.field }),
                message: error.message
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
