import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const VariantOptionValueInputSchema = z.object({
    id: z.string().optional(),
    name: z.string().optional(),
    optionName: z.string().optional(),
    optionId: z.string().optional()
});

const MetafieldInputSchema = z.object({
    id: z.string().optional(),
    namespace: z.string().optional(),
    key: z.string().optional(),
    value: z.string().optional(),
    type: z.string().optional()
});

const VariantUpdateInputSchema = z.object({
    id: z.string().describe('The Shopify GID of the variant to update. Example: gid://shopify/ProductVariant/1234567890'),
    barcode: z.string().optional(),
    compareAtPrice: z.string().optional(),
    price: z.string().optional(),
    sku: z.string().optional(),
    taxable: z.boolean().optional(),
    inventoryPolicy: z.string().optional(),
    mediaId: z.string().optional(),
    mediaSrc: z.array(z.string()).optional(),
    optionValues: z.array(VariantOptionValueInputSchema).optional(),
    metafields: z.array(MetafieldInputSchema).optional()
});

const CreateMediaInputSchema = z.object({
    originalSource: z.string(),
    alt: z.string().optional(),
    mediaContentType: z.string()
});

const InputSchema = z.object({
    productId: z.string().describe('The Shopify GID of the product. Example: gid://shopify/Product/1234567890'),
    allowPartialUpdates: z.boolean().optional(),
    variants: z.array(VariantUpdateInputSchema).min(1),
    media: z.array(CreateMediaInputSchema).optional()
});

const SelectedOptionSchema = z.object({
    name: z.string(),
    value: z.string()
});

const UpdatedVariantSchema = z.object({
    id: z.string(),
    title: z.string().optional(),
    price: z.string().optional(),
    sku: z.string().optional(),
    barcode: z.string().optional(),
    selectedOptions: z.array(SelectedOptionSchema).optional()
});

const UserErrorSchema = z.object({
    field: z.array(z.string()).nullable().optional(),
    message: z.string()
});

const OutputSchema = z.object({
    productId: z.string(),
    variants: z.array(UpdatedVariantSchema),
    userErrors: z.array(UserErrorSchema)
});

const ShopifyResponseSchema = z.object({
    data: z
        .object({
            productVariantsBulkUpdate: z
                .object({
                    product: z
                        .object({
                            id: z.string()
                        })
                        .optional(),
                    productVariants: z
                        .array(
                            z.object({
                                id: z.string(),
                                title: z.string().nullable().optional(),
                                price: z.string().nullable().optional(),
                                sku: z.string().nullable().optional(),
                                barcode: z.string().nullable().optional(),
                                selectedOptions: z.array(SelectedOptionSchema).nullable().optional()
                            })
                        )
                        .optional(),
                    userErrors: z.array(UserErrorSchema).optional()
                })
                .optional()
        })
        .optional(),
    errors: z.array(z.unknown()).optional()
});

const action = createAction({
    description: 'Update one or more variants for a Shopify product.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_products'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const variables: Record<string, unknown> = {
            productId: input.productId,
            variants: input.variants,
            ...(input.media !== undefined && { media: input.media }),
            ...(input.allowPartialUpdates !== undefined && { allowPartialUpdates: input.allowPartialUpdates })
        };

        const query = `
            mutation productVariantsBulkUpdate(
                $productId: ID!,
                $variants: [ProductVariantsBulkInput!]!,
                $media: [CreateMediaInput!],
                $allowPartialUpdates: Boolean
            ) {
                productVariantsBulkUpdate(
                    productId: $productId,
                    variants: $variants,
                    media: $media,
                    allowPartialUpdates: $allowPartialUpdates
                ) {
                    product {
                        id
                    }
                    productVariants {
                        id
                        title
                        price
                        sku
                        barcode
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
        `;

        const config: ProxyConfiguration = {
            // https://shopify.dev/docs/api/admin-graphql/2026-01/mutations/productVariantsBulkUpdate
            endpoint: '/admin/api/2026-01/graphql.json',
            data: {
                query,
                variables
            },
            retries: 3
        };

        const response = await nango.post(config);
        const rawData: unknown = response.data;

        const parsed = ShopifyResponseSchema.parse(rawData);

        if (parsed.errors && parsed.errors.length > 0) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: 'Shopify GraphQL returned errors',
                errors: parsed.errors
            });
        }

        const result = parsed.data?.productVariantsBulkUpdate;

        if (!result) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Missing productVariantsBulkUpdate in response'
            });
        }

        return {
            productId: result.product?.id ?? input.productId,
            variants: (result.productVariants ?? []).map((variant) => ({
                id: variant.id,
                ...(variant.title != null && { title: variant.title }),
                ...(variant.price != null && { price: variant.price }),
                ...(variant.sku != null && { sku: variant.sku }),
                ...(variant.barcode != null && { barcode: variant.barcode }),
                ...(variant.selectedOptions != null && { selectedOptions: variant.selectedOptions })
            })),
            userErrors: (result.userErrors ?? []).map((error) => ({
                ...(error.field != null && { field: error.field }),
                message: error.message
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
