import { z } from 'zod';
import { createAction, type ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The ID of the code discount to activate. Example: "gid://shopify/DiscountCodeNode/206265824"')
});

const UserErrorSchema = z.object({
    field: z.array(z.string()).optional().nullable(),
    code: z.string().optional(),
    message: z.string()
});

const OutputSchema = z.object({
    activated: z.boolean(),
    userErrors: z.array(UserErrorSchema)
});

const GraphQLErrorSchema = z.object({
    message: z.string(),
    extensions: z.record(z.string(), z.unknown()).optional()
});

const ProviderResponseSchema = z.object({
    data: z
        .object({
            discountCodeActivate: z
                .object({
                    codeDiscountNode: z
                        .object({
                            id: z.string()
                        })
                        .nullable()
                        .optional(),
                    userErrors: z.array(
                        z.object({
                            field: z.array(z.string()).nullable().optional(),
                            code: z.string().optional(),
                            message: z.string()
                        })
                    )
                })
                .nullable()
                .optional()
        })
        .optional(),
    errors: z.array(GraphQLErrorSchema).optional()
});

const action = createAction({
    description: 'Activate a code-based Shopify discount',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/activate-discount-code',
        group: 'Discounts'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_discounts'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://shopify.dev/docs/api/admin-graphql/2025-10/mutations/discountCodeActivate
            endpoint: '/admin/api/2025-10/graphql.json',
            data: {
                query: `
                    mutation discountCodeActivate($id: ID!) {
                        discountCodeActivate(id: $id) {
                            codeDiscountNode {
                                id
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
                    id: input.id
                }
            },
            retries: 3
        };

        const response = await nango.post(config);

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Unexpected response structure from Shopify'
            });
        }

        const graphQLErrors = parsed.data.errors;
        if (graphQLErrors && graphQLErrors.length > 0) {
            const firstError = graphQLErrors[0];
            throw new nango.ActionError({
                type: 'graphql_error',
                message: firstError ? firstError.message : 'GraphQL error from Shopify',
                errors: graphQLErrors.map((err) => err.message)
            });
        }

        const payload = parsed.data.data?.discountCodeActivate;
        if (!payload) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'No discountCodeActivate data returned from Shopify'
            });
        }

        const activated = payload.userErrors.length === 0 && payload.codeDiscountNode != null;

        return {
            activated,
            userErrors: payload.userErrors.map((err) => ({
                field: err.field ?? null,
                code: err.code,
                message: err.message
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
