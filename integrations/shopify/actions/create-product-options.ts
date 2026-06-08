import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const OptionValueCreateInputSchema = z.object({
    name: z.string(),
    linkedMetafieldValue: z.string().optional()
});

const OptionCreateInputSchema = z.object({
    name: z.string(),
    position: z.number().optional(),
    values: z.array(OptionValueCreateInputSchema)
});

const InputSchema = z.object({
    productId: z.string().describe('The ID of the product to update. Example: "gid://shopify/Product/20995642"'),
    options: z.array(OptionCreateInputSchema),
    variantStrategy: z.string().optional().describe('The variant strategy. Example: "LEAVE_AS_IS" or "CREATE"')
});

const UserErrorSchema = z.object({
    code: z.string().optional(),
    field: z.array(z.string()).optional(),
    message: z.string()
});

const ProductOptionValueSchema = z.object({
    id: z.string().optional(),
    name: z.string(),
    hasVariants: z.boolean()
});

const ProductOptionSchema = z.object({
    id: z.string(),
    name: z.string(),
    position: z.number(),
    values: z.array(z.string()),
    optionValues: z.array(ProductOptionValueSchema).optional()
});

const OutputSchema = z.object({
    options: z.array(ProductOptionSchema),
    userErrors: z.array(UserErrorSchema)
});

const action = createAction({
    description: 'Create one or more options on a Shopify product.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-product-options',
        group: 'Products'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_products'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://shopify.dev/docs/api/admin-graphql/2026-04/mutations/productOptionsCreate
            endpoint: '/admin/api/2026-04/graphql.json',
            data: {
                query: `mutation productOptionsCreate($productId: ID!, $options: [OptionCreateInput!]!, $variantStrategy: ProductOptionCreateVariantStrategy) {
                    productOptionsCreate(productId: $productId, options: $options, variantStrategy: $variantStrategy) {
                        userErrors {
                            code
                            field
                            message
                        }
                        product {
                            options {
                                id
                                name
                                position
                                values
                                optionValues {
                                    id
                                    name
                                    hasVariants
                                }
                            }
                        }
                    }
                }`,
                variables: {
                    productId: input.productId,
                    options: input.options,
                    ...(input.variantStrategy !== undefined && { variantStrategy: input.variantStrategy })
                }
            },
            retries: 3
        };

        const response = await nango.post(config);

        const ProviderResponseSchema = z.object({
            data: z
                .object({
                    productOptionsCreate: z
                        .object({
                            userErrors: z.array(
                                z.object({
                                    code: z.string().optional(),
                                    field: z.array(z.string()).optional(),
                                    message: z.string()
                                })
                            ),
                            product: z
                                .object({
                                    options: z
                                        .array(
                                            z.object({
                                                id: z.string(),
                                                name: z.string(),
                                                position: z.number(),
                                                values: z.array(z.string()),
                                                optionValues: z
                                                    .array(
                                                        z.object({
                                                            id: z.string().optional(),
                                                            name: z.string(),
                                                            hasVariants: z.boolean()
                                                        })
                                                    )
                                                    .optional()
                                            })
                                        )
                                        .optional()
                                })
                                .optional()
                        })
                        .optional()
                })
                .optional(),
            errors: z.array(z.unknown()).optional()
        });

        const body = ProviderResponseSchema.parse(response.data);

        if (body.errors && body.errors.length > 0) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: 'GraphQL errors occurred',
                errors: body.errors
            });
        }

        const result = body.data?.productOptionsCreate;

        if (!result) {
            throw new nango.ActionError({
                type: 'missing_response',
                message: 'Unexpected response from Shopify'
            });
        }

        return {
            options: result.product?.options ?? [],
            userErrors: result.userErrors ?? []
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
