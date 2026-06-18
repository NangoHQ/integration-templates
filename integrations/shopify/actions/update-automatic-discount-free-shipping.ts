import { z } from 'zod';
import { createAction } from 'nango';

const DiscountMinimumQuantityInputSchema = z
    .object({
        greaterThanOrEqualToQuantity: z.string().nullable().optional()
    })
    .optional();

const DiscountMinimumSubtotalInputSchema = z
    .object({
        greaterThanOrEqualToSubtotal: z.string().nullable().optional()
    })
    .optional();

const DiscountMinimumRequirementInputSchema = z
    .object({
        quantity: DiscountMinimumQuantityInputSchema,
        subtotal: DiscountMinimumSubtotalInputSchema
    })
    .optional();

const DiscountShippingDestinationInputSchema = z
    .object({
        all: z.boolean().optional(),
        countries: z
            .array(
                z.object({
                    code: z.string(),
                    include: z.boolean().optional()
                })
            )
            .optional()
    })
    .optional();

const DiscountAutomaticFreeShippingInputSchema = z
    .object({
        title: z.string().optional(),
        startsAt: z.string().optional(),
        endsAt: z.string().nullable().optional(),
        minimumRequirement: DiscountMinimumRequirementInputSchema,
        destination: DiscountShippingDestinationInputSchema,
        context: z.record(z.string(), z.unknown()).optional()
    })
    .passthrough();

const InputSchema = z.object({
    id: z.string().describe('The ID of the automatic free shipping discount to update. Example: "gid://shopify/DiscountAutomaticNode/1057856655"'),
    freeShippingAutomaticDiscount: DiscountAutomaticFreeShippingInputSchema
});

const UserErrorSchema = z.object({
    field: z.array(z.string()).nullable().optional(),
    message: z.string(),
    code: z.string().nullable().optional()
});

const AutomaticDiscountNodeSchema = z.object({
    id: z.string(),
    automaticDiscount: z
        .object({
            title: z.string().optional(),
            startsAt: z.string().optional(),
            endsAt: z.string().nullable().optional()
        })
        .optional()
});

const OutputSchema = z.object({
    automaticDiscountNode: AutomaticDiscountNodeSchema.optional(),
    userErrors: z.array(UserErrorSchema)
});

const GraphQLResponseSchema = z.object({
    data: z
        .object({
            discountAutomaticFreeShippingUpdate: z
                .object({
                    automaticDiscountNode: z.unknown().optional(),
                    userErrors: z.unknown().optional()
                })
                .optional()
        })
        .optional(),
    errors: z.array(z.unknown()).optional()
});

const action = createAction({
    description: 'Update an automatic free shipping Shopify discount.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_discounts'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const query = `
            mutation discountAutomaticFreeShippingUpdate($id: ID!, $freeShippingAutomaticDiscount: DiscountAutomaticFreeShippingInput!) {
                discountAutomaticFreeShippingUpdate(id: $id, freeShippingAutomaticDiscount: $freeShippingAutomaticDiscount) {
                    automaticDiscountNode {
                        id
                        automaticDiscount {
                            ... on DiscountAutomaticFreeShipping {
                                title
                                startsAt
                                endsAt
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

        const response = await nango.post({
            // https://shopify.dev/docs/api/admin-graphql/2026-04/mutations/discountAutomaticFreeShippingUpdate
            endpoint: '/admin/api/2026-04/graphql.json',
            data: {
                query,
                variables: {
                    id: input.id,
                    freeShippingAutomaticDiscount: input.freeShippingAutomaticDiscount
                }
            },
            retries: 1
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Invalid response from Shopify'
            });
        }

        const payloadParse = GraphQLResponseSchema.safeParse(response.data);
        if (!payloadParse.success) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Unexpected response structure from Shopify'
            });
        }

        const payload = payloadParse.data;

        if (payload.errors && payload.errors.length > 0) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: 'Shopify GraphQL returned errors',
                errors: payload.errors
            });
        }

        const updateResult = payload.data?.discountAutomaticFreeShippingUpdate;

        if (!updateResult) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Unexpected response from Shopify'
            });
        }

        const userErrorsParse = z.array(UserErrorSchema).safeParse(updateResult.userErrors ?? []);
        if (!userErrorsParse.success) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Unexpected userErrors structure from Shopify'
            });
        }

        const automaticDiscountNode = updateResult.automaticDiscountNode ? AutomaticDiscountNodeSchema.parse(updateResult.automaticDiscountNode) : undefined;

        return {
            ...(automaticDiscountNode && { automaticDiscountNode }),
            userErrors: userErrorsParse.data
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
