import { z } from 'zod';
import { createAction } from 'nango';

const OptionValueInputSchema = z.object({
    name: z.string().optional(),
    optionName: z.string().optional(),
    optionId: z.string().optional(),
    id: z.string().optional()
});

const InventoryItemInputSchema = z.object({
    sku: z.string().optional(),
    cost: z.union([z.string(), z.number()]).optional()
});

const MetafieldInputSchema = z.object({
    namespace: z.string(),
    key: z.string(),
    type: z.string(),
    value: z.string()
});

const VariantInputSchema = z.object({
    price: z.union([z.string(), z.number()]).optional(),
    compareAtPrice: z.union([z.string(), z.number()]).optional(),
    optionValues: z.array(OptionValueInputSchema).optional(),
    inventoryItem: InventoryItemInputSchema.optional(),
    inventoryPolicy: z.enum(['DENY', 'CONTINUE']).optional(),
    mediaId: z.string().optional(),
    mediaSrc: z.array(z.string()).optional(),
    metafields: z.array(MetafieldInputSchema).optional()
});

const MediaInputSchema = z.object({
    mediaContentType: z.enum(['IMAGE', 'VIDEO', 'MODEL_3D', 'EXTERNAL_VIDEO']),
    alt: z.string().optional(),
    originalSource: z.string().optional()
});

const InputSchema = z.object({
    productId: z.string().describe('Shopify product ID. Example: "gid://shopify/Product/123"'),
    strategy: z.enum(['DEFAULT', 'REMOVE_STANDALONE_VARIANT']).optional(),
    variants: z.array(VariantInputSchema).min(1),
    media: z.array(MediaInputSchema).optional()
});

const SelectedOptionSchema = z.object({
    name: z.string(),
    value: z.string()
});

const ProductVariantSchema = z.object({
    id: z.string(),
    title: z.string(),
    price: z.string().optional(),
    compareAtPrice: z.string().nullable().optional(),
    selectedOptions: z.array(SelectedOptionSchema).optional()
});

const UserErrorSchema = z.object({
    field: z.array(z.string()).nullable().optional(),
    message: z.string()
});

const OutputSchema = z.object({
    productVariants: z.array(ProductVariantSchema),
    userErrors: z.array(UserErrorSchema)
});

const action = createAction({
    description: 'Create one or more variants for a Shopify product.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_products'],

    exec: async (nango, input) => {
        const variables = {
            productId: input.productId,
            variants: input.variants,
            strategy: input.strategy ?? null,
            media: input.media ?? null
        };

        const response = await nango.post({
            // https://shopify.dev/docs/api/admin-graphql/latest/mutations/productVariantsBulkCreate
            endpoint: '/admin/api/2026-04/graphql.json',
            data: {
                query: `
                    mutation ProductVariantsBulkCreate($productId: ID!, $variants: [ProductVariantsBulkInput!]!, $strategy: ProductVariantsBulkCreateStrategy, $media: [CreateMediaInput!]) {
                        productVariantsBulkCreate(productId: $productId, variants: $variants, strategy: $strategy, media: $media) {
                            productVariants {
                                id
                                title
                                price
                                compareAtPrice
                                selectedOptions {
                                    name
                                    value
                                }
                            }
                            userErrors {
                                field
                                message
                            }
                        }
                    }
                `,
                variables
            },
            retries: 10
        });

        const body = z
            .object({
                data: z
                    .object({
                        productVariantsBulkCreate: z
                            .object({
                                productVariants: z.array(z.unknown()).default([]),
                                userErrors: z.array(z.unknown()).default([])
                            })
                            .optional()
                    })
                    .optional()
            })
            .parse(response.data);

        const result = body.data?.productVariantsBulkCreate;
        if (!result) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Unexpected response from Shopify: missing productVariantsBulkCreate payload.'
            });
        }

        const productVariants = result.productVariants.map((variant) => {
            const parsed = ProductVariantSchema.safeParse(variant);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'provider_error',
                    message: 'Unexpected variant shape from Shopify.'
                });
            }
            return parsed.data;
        });

        const userErrors = result.userErrors.map((error) => {
            const parsed = UserErrorSchema.safeParse(error);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'provider_error',
                    message: 'Unexpected user error shape from Shopify.'
                });
            }
            return parsed.data;
        });

        return {
            productVariants,
            userErrors
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
