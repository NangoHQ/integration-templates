import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    discountNodeId: z.string().describe('The ID of the automatic discount to deactivate. Example: "gid://shopify/DiscountAutomaticNode/123"')
});

const UserErrorSchema = z.object({
    field: z.array(z.string()).optional(),
    message: z.string()
});

const OutputSchema = z.object({
    status: z.string().optional(),
    startsAt: z.string().nullable().optional(),
    endsAt: z.string().nullable().optional(),
    userErrors: z.array(UserErrorSchema).optional()
});

const GraphQLResponseSchema = z.object({
    data: z
        .object({
            discountAutomaticDeactivate: z
                .object({
                    automaticDiscountNode: z
                        .object({
                            automaticDiscount: z
                                .object({
                                    status: z.string().optional(),
                                    startsAt: z.string().nullable().optional(),
                                    endsAt: z.string().nullable().optional()
                                })
                                .optional()
                        })
                        .optional(),
                    userErrors: z.array(UserErrorSchema).optional()
                })
                .optional()
        })
        .optional()
});

const action = createAction({
    description: 'Deactivate an automatic Shopify discount.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_discounts'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://shopify.dev/docs/api/admin-graphql/latest/mutations/discountAutomaticDeactivate
            endpoint: '/admin/api/2026-04/graphql.json',
            data: {
                query: `
                    mutation discountAutomaticDeactivate($id: ID!) {
                        discountAutomaticDeactivate(id: $id) {
                            automaticDiscountNode {
                                automaticDiscount {
                                    ... on DiscountAutomaticBasic {
                                        status
                                        startsAt
                                        endsAt
                                    }
                                    ... on DiscountAutomaticBxgy {
                                        status
                                        startsAt
                                        endsAt
                                    }
                                    ... on DiscountAutomaticFreeShipping {
                                        status
                                        startsAt
                                        endsAt
                                    }
                                }
                            }
                            userErrors {
                                field
                                message
                            }
                        }
                    }
                `,
                variables: {
                    id: input.discountNodeId
                }
            },
            retries: 3
        });

        const parsed = GraphQLResponseSchema.parse(response.data);
        const result = parsed.data?.discountAutomaticDeactivate;

        if (!result) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Unexpected response from Shopify GraphQL API',
                response: response.data
            });
        }

        const userErrors = result.userErrors ?? [];
        const discount = result.automaticDiscountNode?.automaticDiscount;

        return {
            ...(discount?.status !== undefined && { status: discount.status }),
            ...(discount?.startsAt !== undefined && { startsAt: discount.startsAt }),
            ...(discount?.endsAt !== undefined && { endsAt: discount.endsAt }),
            userErrors
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
