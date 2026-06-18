import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The ID of the automatic discount to activate. Example: gid://shopify/DiscountAutomaticNode/123')
});

const UserErrorSchema = z.object({
    field: z.array(z.string()).optional(),
    message: z.string()
});

const OutputSchema = z.object({
    status: z.string().optional(),
    userErrors: z.array(UserErrorSchema).optional()
});

const action = createAction({
    description: 'Activate an automatic Shopify discount.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_discounts'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://shopify.dev/docs/api/admin-graphql/2026-04/mutations/discountAutomaticActivate
        const response = await nango.post({
            endpoint: '/admin/api/2026-04/graphql.json',
            data: {
                query: `
                    mutation discountAutomaticActivate($id: ID!) {
                        discountAutomaticActivate(id: $id) {
                            automaticDiscountNode {
                                id
                                automaticDiscount {
                                    ... on DiscountAutomaticBasic {
                                        status
                                    }
                                    ... on DiscountAutomaticBxgy {
                                        status
                                    }
                                    ... on DiscountAutomaticFreeShipping {
                                        status
                                    }
                                    ... on DiscountAutomaticApp {
                                        status
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
                    id: input.id
                }
            },
            retries: 1
        });

        const payload = z
            .object({
                data: z
                    .object({
                        discountAutomaticActivate: z
                            .object({
                                automaticDiscountNode: z
                                    .object({
                                        automaticDiscount: z
                                            .object({
                                                status: z.string().optional()
                                            })
                                            .optional()
                                    })
                                    .optional(),
                                userErrors: z.array(
                                    z.object({
                                        field: z.array(z.string()).optional().nullable(),
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
            })
            .parse(response.data);

        const result = payload.data?.discountAutomaticActivate;

        if (!result) {
            const graphQLErrors = payload.errors?.map((error) => error.message).join(', ');
            throw new nango.ActionError({
                type: 'graphql_error',
                message: graphQLErrors || 'Failed to activate automatic discount'
            });
        }

        return {
            ...(result.automaticDiscountNode?.automaticDiscount?.status != null && {
                status: result.automaticDiscountNode.automaticDiscount.status
            }),
            userErrors: result.userErrors.map((error) => ({
                ...(error.field != null && { field: error.field }),
                message: error.message
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
