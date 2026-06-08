import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    productId: z.string().describe('ID of the product from which to delete options. Example: "gid://shopify/Product/1234567890"'),
    options: z.array(z.string()).describe('IDs of the options to delete from the product. Example: ["gid://shopify/ProductOption/123"]'),
    strategy: z
        .enum(['DEFAULT', 'NON_DESTRUCTIVE', 'POSITION'])
        .optional()
        .describe(
            'Deletion strategy. DEFAULT: option may only have one value. NON_DESTRUCTIVE: multiple values allowed if no variants deleted. POSITION: deletes duplicate variants highest position first.'
        )
});

const UserErrorSchema = z.object({
    field: z.array(z.string()).optional(),
    message: z.string(),
    code: z.string().optional()
});

const ProviderResponseSchema = z.object({
    data: z
        .object({
            productOptionsDelete: z.object({
                deletedOptionsIds: z.array(z.string()).optional(),
                userErrors: z.array(UserErrorSchema)
            })
        })
        .optional(),
    errors: z.array(z.unknown()).optional()
});

const OutputSchema = z.object({
    deletedOptionsIds: z.array(z.string()).optional(),
    userErrors: z.array(UserErrorSchema)
});

const action = createAction({
    description: 'Delete one or more options from a Shopify product.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-product-options',
        group: 'Products'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_products'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const query = `
            mutation deleteProductOptions($productId: ID!, $options: [ID!]!, $strategy: ProductOptionDeleteStrategy) {
                productOptionsDelete(productId: $productId, options: $options, strategy: $strategy) {
                    deletedOptionsIds
                    userErrors {
                        field
                        message
                        code
                    }
                }
            }
        `;

        const variables: { productId: string; options: string[]; strategy?: string } = {
            productId: input.productId,
            options: input.options
        };
        if (input.strategy !== undefined) {
            variables.strategy = input.strategy;
        }

        const response = await nango.post({
            // https://shopify.dev/docs/api/admin-graphql/2026-01/mutations/productOptionsDelete
            endpoint: '/admin/api/2026-01/graphql.json',
            data: {
                query,
                variables
            },
            retries: 1
        });

        const providerData = ProviderResponseSchema.parse(response.data);

        if (providerData.errors && providerData.errors.length > 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Shopify GraphQL returned errors.',
                errors: providerData.errors
            });
        }

        const result = providerData.data?.productOptionsDelete;

        if (!result) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Unexpected response from Shopify: productOptionsDelete not found.'
            });
        }

        return {
            deletedOptionsIds: result.deletedOptionsIds,
            userErrors: result.userErrors
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
