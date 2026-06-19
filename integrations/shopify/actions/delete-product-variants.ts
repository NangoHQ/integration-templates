import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    product_id: z.string().describe('The GraphQL global ID of the product. Example: "gid://shopify/Product/20995642"'),
    variant_ids: z
        .array(z.string())
        .describe('An array of GraphQL global IDs of the product variants to delete. Example: ["gid://shopify/ProductVariant/30322695"]')
});

const ProviderUserErrorSchema = z.object({
    field: z.array(z.string()),
    message: z.string()
});

const ProviderProductSchema = z.object({
    id: z.string(),
    title: z.string()
});

const ProviderResponseSchema = z.object({
    data: z.object({
        productVariantsBulkDelete: z.object({
            product: ProviderProductSchema.nullable(),
            userErrors: z.array(ProviderUserErrorSchema)
        })
    })
});

const OutputSchema = z.object({
    product_id: z.string().optional(),
    product_title: z.string().optional(),
    deleted_variant_ids: z.array(z.string())
});

const action = createAction({
    description: 'Delete one or more variants from a Shopify product.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_products'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://shopify.dev/docs/api/admin-graphql/2025-10/mutations/productVariantsBulkDelete
            endpoint: '/admin/api/2025-10/graphql.json',
            data: {
                query: `mutation ProductVariantsDelete($productId: ID!, $variantsIds: [ID!]!) {
                    productVariantsBulkDelete(productId: $productId, variantsIds: $variantsIds) {
                        product {
                            id
                            title
                        }
                        userErrors {
                            field
                            message
                        }
                    }
                }`,
                variables: {
                    productId: input.product_id,
                    variantsIds: input.variant_ids
                }
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const result = providerResponse.data.productVariantsBulkDelete;

        if (result.userErrors.length > 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: result.userErrors.map((error) => error.message).join('; '),
                user_errors: result.userErrors
            });
        }

        return {
            ...(result.product != null && { product_id: result.product.id }),
            ...(result.product != null && { product_title: result.product.title }),
            deleted_variant_ids: input.variant_ids
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
