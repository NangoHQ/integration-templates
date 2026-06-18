import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    productId: z.string().describe('Shopify product ID. Example: "gid://shopify/Product/123"'),
    mediaIds: z.array(z.string()).describe('Shopify media IDs to delete. Example: ["gid://shopify/MediaImage/456"]')
});

const ProviderResponseSchema = z.object({
    data: z
        .object({
            productDeleteMedia: z
                .object({
                    deletedMediaIds: z.array(z.string()).nullable().optional(),
                    deletedProductImageIds: z.array(z.string()).nullable().optional(),
                    mediaUserErrors: z.array(
                        z.object({
                            field: z.array(z.string()).optional(),
                            message: z.string()
                        })
                    )
                })
                .nullable()
        })
        .nullable(),
    errors: z
        .array(
            z.object({
                message: z.string(),
                path: z.array(z.string().or(z.number())).optional()
            })
        )
        .optional()
});

const OutputSchema = z.object({
    deletedMediaIds: z.array(z.string()).optional(),
    deletedProductImageIds: z.array(z.string()).optional(),
    productId: z.string()
});

const action = createAction({
    description: 'Delete media from a Shopify product.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_products'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://shopify.dev/docs/api/admin-graphql/2026-04/mutations/productDeleteMedia
            endpoint: '/admin/api/2026-04/graphql.json',
            data: {
                query: `
                    mutation productDeleteMedia($mediaIds: [ID!]!, $productId: ID!) {
                        productDeleteMedia(mediaIds: $mediaIds, productId: $productId) {
                            deletedMediaIds
                            deletedProductImageIds
                            mediaUserErrors {
                                field
                                message
                            }
                        }
                    }
                `,
                variables: {
                    mediaIds: input.mediaIds,
                    productId: input.productId
                }
            },
            retries: 1
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.errors && providerResponse.errors.length > 0) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: providerResponse.errors.map((err) => err.message).join(', ')
            });
        }

        if (!providerResponse.data || !providerResponse.data.productDeleteMedia) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Unexpected response from Shopify'
            });
        }

        const result = providerResponse.data.productDeleteMedia;

        if (result.mediaUserErrors.length > 0) {
            throw new nango.ActionError({
                type: 'shopify_error',
                message: result.mediaUserErrors.map((err) => err.message).join(', '),
                errors: result.mediaUserErrors
            });
        }

        return {
            productId: input.productId,
            ...(result.deletedMediaIds != null && { deletedMediaIds: result.deletedMediaIds }),
            ...(result.deletedProductImageIds != null && { deletedProductImageIds: result.deletedProductImageIds })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
