import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        title: z.string(),
        startsAt: z.string(),
        customerGets: z.record(z.string(), z.unknown()),
        endsAt: z.string().optional(),
        combinesWith: z.record(z.string(), z.unknown()).optional(),
        minimumRequirement: z.record(z.string(), z.unknown()).optional(),
        context: z.record(z.string(), z.unknown()).optional(),
        recurringCycleLimit: z.number().optional(),
        usageLimit: z.number().optional(),
        appliesOncePerCustomer: z.boolean().optional(),
        customerSelection: z.record(z.string(), z.unknown()).optional(),
        tags: z.array(z.string()).optional()
    })
    .passthrough();

const OutputSchema = z
    .object({
        id: z.string(),
        automaticDiscount: z.record(z.string(), z.unknown()).optional()
    })
    .passthrough();

const UserErrorSchema = z.object({
    field: z.array(z.string()).optional(),
    code: z.string().optional(),
    message: z.string()
});

const MutationResponseSchema = z.object({
    data: z
        .object({
            discountAutomaticBasicCreate: z
                .object({
                    automaticDiscountNode: z.record(z.string(), z.unknown()).nullish(),
                    userErrors: z.array(UserErrorSchema)
                })
                .optional()
        })
        .optional()
});

const action = createAction({
    description: 'Create an automatic basic Shopify discount.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_discounts', 'read_discounts'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const query = `
            mutation discountAutomaticBasicCreate($automaticBasicDiscount: DiscountAutomaticBasicInput!) {
                discountAutomaticBasicCreate(automaticBasicDiscount: $automaticBasicDiscount) {
                    automaticDiscountNode {
                        id
                        automaticDiscount {
                            ... on DiscountAutomaticBasic {
                                title
                                startsAt
                                endsAt
                                combinesWith {
                                    productDiscounts
                                    shippingDiscounts
                                    orderDiscounts
                                }
                                minimumRequirement {
                                    ... on DiscountMinimumSubtotal {
                                        greaterThanOrEqualToSubtotal {
                                            amount
                                            currencyCode
                                        }
                                    }
                                    ... on DiscountMinimumQuantity {
                                        greaterThanOrEqualToQuantity
                                    }
                                }
                                customerGets {
                                    value {
                                        ... on DiscountAmount {
                                            amount {
                                                amount
                                                currencyCode
                                            }
                                            appliesOnEachItem
                                        }
                                        ... on DiscountPercentage {
                                            percentage
                                        }
                                    }
                                    items {
                                        ... on AllDiscountItems {
                                            allItems
                                        }
                                        ... on DiscountCollections {
                                            collections {
                                                nodes {
                                                    id
                                                }
                                            }
                                        }
                                        ... on DiscountProducts {
                                            products {
                                                nodes {
                                                    id
                                                }
                                            }
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
                    }
                }
            }
        `;

        const response = await nango.post({
            // https://shopify.dev/docs/api/admin-graphql/latest/mutations/discountAutomaticBasicCreate
            endpoint: '/admin/api/2025-04/graphql.json',
            data: {
                query,
                variables: {
                    automaticBasicDiscount: input
                }
            },
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const parsedResponse = MutationResponseSchema.parse(response.data);
        const mutationResult = parsedResponse.data?.discountAutomaticBasicCreate;

        if (!mutationResult) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Unexpected response structure from Shopify'
            });
        }

        const userErrors = mutationResult.userErrors;
        if (userErrors.length > 0) {
            const firstError = userErrors[0];
            if (firstError) {
                throw new nango.ActionError({
                    type: 'validation_error',
                    message: firstError.message,
                    errors: userErrors
                });
            }
        }

        const node = mutationResult.automaticDiscountNode;
        if (!node) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Discount node not returned from Shopify'
            });
        }

        const providerNode = OutputSchema.parse(node);
        return providerNode;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
