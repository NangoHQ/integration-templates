import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The ID of the automatic discount to delete. Example: "gid://shopify/DiscountAutomaticNode/123"')
});

const DiscountUserErrorSchema = z.object({
    field: z.array(z.string()).nullable().optional(),
    code: z.string().nullable().optional(),
    message: z.string()
});

const OutputSchema = z.object({
    success: z.boolean(),
    deletedAutomaticDiscountId: z.string().optional(),
    userErrors: z.array(DiscountUserErrorSchema).optional()
});

const GraphQLResponseSchema = z.object({
    data: z.object({
        discountAutomaticDelete: z.object({
            deletedAutomaticDiscountId: z.string().nullable().optional(),
            userErrors: z.array(DiscountUserErrorSchema)
        })
    }),
    errors: z.array(z.unknown()).optional()
});

const action = createAction({
    description: 'Delete an automatic Shopify discount.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-automatic-discount',
        group: 'Discounts'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_discounts'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://shopify.dev/docs/api/admin-graphql/2026-01/mutations/discountAutomaticDelete
            endpoint: '/admin/api/2026-01/graphql.json',
            data: {
                query: `
                    mutation discountAutomaticDelete($id: ID!) {
                        discountAutomaticDelete(id: $id) {
                            deletedAutomaticDiscountId
                            userErrors {
                                field
                                code
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
        };

        const response = await nango.post(config);

        const parsed = GraphQLResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Shopify API',
                details: parsed.error.issues
            });
        }

        if (parsed.data.errors && parsed.data.errors.length > 0) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: 'GraphQL execution error',
                errors: parsed.data.errors
            });
        }

        const result = parsed.data.data.discountAutomaticDelete;
        const success = result.deletedAutomaticDiscountId != null && result.userErrors.length === 0;

        return {
            success,
            ...(result.deletedAutomaticDiscountId != null && { deletedAutomaticDiscountId: result.deletedAutomaticDiscountId }),
            ...(result.userErrors.length > 0 && { userErrors: result.userErrors })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
