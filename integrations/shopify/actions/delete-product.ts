import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    productId: z.string().describe('The GraphQL ID (GID) of the product to delete. Example: "gid://shopify/Product/123"')
});

const ProviderResponseSchema = z.object({
    data: z
        .object({
            productDelete: z
                .object({
                    deletedProductId: z.string().nullable().optional(),
                    userErrors: z.array(
                        z.object({
                            field: z.array(z.string()).nullable().optional(),
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
                message: z.string(),
                extensions: z.record(z.string(), z.unknown()).optional()
            })
        )
        .optional()
});

const OutputSchema = z.object({
    deletedProductId: z.string().optional(),
    userErrors: z.array(
        z.object({
            field: z.array(z.string()).nullable().optional(),
            message: z.string()
        })
    )
});

const action = createAction({
    description: 'Delete a Shopify product by GraphQL ID.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-product',
        group: 'Products'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_products'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://shopify.dev/docs/api/admin-graphql/2024-10/mutations/productDelete
            endpoint: '/admin/api/2024-10/graphql.json',
            data: {
                query: `
                    mutation productDelete($input: ProductDeleteInput!) {
                        productDelete(input: $input) {
                            deletedProductId
                            userErrors {
                                field
                                message
                            }
                        }
                    }
                `,
                variables: {
                    input: {
                        id: input.productId
                    }
                }
            },
            retries: 10
        });

        const payload = ProviderResponseSchema.parse(response.data);

        if (payload.errors && payload.errors.length > 0) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: payload.errors.map((e) => e.message).join(', ')
            });
        }

        const productDelete = payload.data?.productDelete;

        if (!productDelete) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Missing productDelete data in response'
            });
        }

        return {
            ...(productDelete.deletedProductId != null && {
                deletedProductId: productDelete.deletedProductId
            }),
            userErrors: productDelete.userErrors
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
