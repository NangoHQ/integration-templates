import { z } from 'zod';
import { createAction } from 'nango';

const OptionValueCreateInputSchema = z.object({
    name: z.string().describe('The name of the new option value.')
});

const OptionValueUpdateInputSchema = z.object({
    id: z.string().describe('The ID of the option value to update. Example: "gid://shopify/ProductOptionValue/123"'),
    name: z.string().optional().describe('The new name of the option value.')
});

const OptionUpdateInputSchema = z.object({
    id: z.string().describe('The ID of the option to update. Example: "gid://shopify/ProductOption/123"'),
    name: z.string().optional().describe('The new name of the option.'),
    position: z.number().optional().describe('The new position of the option.'),
    valuesToAdd: z.array(OptionValueCreateInputSchema).optional().describe('New option values to create.'),
    valuesToUpdate: z.array(OptionValueUpdateInputSchema).optional().describe('Existing option values to update.'),
    valuesToDelete: z.array(z.string()).optional().describe('IDs of existing option values to delete.')
});

const InputSchema = z.object({
    productId: z.string().describe('The ID of the product. Example: "gid://shopify/Product/123"'),
    options: z.array(OptionUpdateInputSchema).describe('The options to update.')
});

const OptionValueSchema = z.object({
    id: z.string(),
    name: z.string(),
    hasVariants: z.boolean().optional()
});

const OptionSchema = z.object({
    id: z.string(),
    name: z.string(),
    position: z.number().optional(),
    values: z.array(z.string()).optional(),
    optionValues: z.array(OptionValueSchema).optional()
});

const UserErrorSchema = z.object({
    field: z.array(z.string()).optional(),
    message: z.string(),
    code: z.string().optional()
});

const OutputSchema = z.object({
    productId: z.string(),
    options: z.array(OptionSchema),
    userErrors: z.array(UserErrorSchema)
});

const GraphQLErrorSchema = z.object({
    message: z.string()
});

const ProviderOptionValueSchema = z.object({
    id: z.string(),
    name: z.string(),
    hasVariants: z.boolean().optional()
});

const ProviderOptionSchema = z.object({
    id: z.string(),
    name: z.string(),
    position: z.number().optional(),
    values: z.array(z.string()).optional(),
    optionValues: z.array(ProviderOptionValueSchema).optional()
});

const ProviderProductSchema = z.object({
    id: z.string(),
    options: z.array(z.unknown())
});

const ProviderPayloadSchema = z.object({
    data: z
        .object({
            productOptionUpdate: z
                .object({
                    userErrors: z.array(z.unknown()),
                    product: ProviderProductSchema.optional()
                })
                .optional()
        })
        .optional(),
    errors: z.array(GraphQLErrorSchema).optional()
});

const action = createAction({
    description: 'Update options on a Shopify product.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-product-options',
        group: 'Products'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_products'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let lastProduct: { id: string; options: unknown[] } | null = null;
        const allUserErrors: Array<z.infer<typeof UserErrorSchema>> = [];

        for (const option of input.options) {
            const optionInput: { id: string; name?: string; position?: number } = {
                id: option.id
            };
            if (option.name !== undefined) {
                optionInput.name = option.name;
            }
            if (option.position !== undefined) {
                optionInput.position = option.position;
            }

            const variables: {
                productId: string;
                option: { id: string; name?: string; position?: number };
                optionValuesToAdd?: Array<z.infer<typeof OptionValueCreateInputSchema>>;
                optionValuesToUpdate?: Array<z.infer<typeof OptionValueUpdateInputSchema>>;
                optionValuesToDelete?: string[];
            } = {
                productId: input.productId,
                option: optionInput
            };
            if (option.valuesToAdd !== undefined && option.valuesToAdd.length > 0) {
                variables.optionValuesToAdd = option.valuesToAdd;
            }
            if (option.valuesToUpdate !== undefined && option.valuesToUpdate.length > 0) {
                variables.optionValuesToUpdate = option.valuesToUpdate;
            }
            if (option.valuesToDelete !== undefined && option.valuesToDelete.length > 0) {
                variables.optionValuesToDelete = option.valuesToDelete;
            }

            const response = await nango.post({
                // https://shopify.dev/docs/api/admin-graphql/2026-01/mutations/productOptionUpdate
                endpoint: '/admin/api/2026-01/graphql.json',
                data: {
                    query: `
                        mutation UpdateProductOption(
                            $productId: ID!,
                            $option: OptionUpdateInput!,
                            $optionValuesToAdd: [OptionValueCreateInput!],
                            $optionValuesToUpdate: [OptionValueUpdateInput!],
                            $optionValuesToDelete: [ID!]
                        ) {
                            productOptionUpdate(
                                productId: $productId,
                                option: $option,
                                optionValuesToAdd: $optionValuesToAdd,
                                optionValuesToUpdate: $optionValuesToUpdate,
                                optionValuesToDelete: $optionValuesToDelete
                            ) {
                                userErrors {
                                    field
                                    message
                                    code
                                }
                                product {
                                    id
                                    options {
                                        id
                                        name
                                        values
                                        position
                                        optionValues {
                                            id
                                            name
                                            hasVariants
                                        }
                                    }
                                }
                            }
                        }
                    `,
                    variables
                },
                retries: 3
            });

            const parsed = ProviderPayloadSchema.safeParse(response.data);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'parse_error',
                    message: 'Failed to parse provider response.',
                    details: parsed.error.message
                });
            }

            const payload = parsed.data;

            const firstError = payload.errors?.[0];
            if (firstError) {
                throw new nango.ActionError({
                    type: 'provider_error',
                    message: firstError.message
                });
            }

            const result = payload.data?.productOptionUpdate;
            if (result) {
                const errors = result.userErrors.map((err: unknown) => {
                    const parsedError = UserErrorSchema.safeParse(err);
                    if (!parsedError.success) {
                        return { message: String(err) };
                    }
                    return parsedError.data;
                });
                allUserErrors.push(...errors);

                if (result.product) {
                    lastProduct = result.product;
                }
            }
        }

        if (!lastProduct) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Product not found or no options were updated.'
            });
        }

        const parsedOptions = lastProduct.options.map((opt: unknown) => {
            const parsedOption = ProviderOptionSchema.safeParse(opt);
            if (!parsedOption.success) {
                throw new nango.ActionError({
                    type: 'parse_error',
                    message: 'Failed to parse option from provider response.',
                    details: parsedOption.error.message
                });
            }
            return parsedOption.data;
        });

        return {
            productId: lastProduct.id,
            options: parsedOptions,
            userErrors: allUserErrors
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
