import { z } from 'zod';
import { createAction } from 'nango';

const MediaUpdateInputSchema = z.object({
    id: z.string().describe('Media ID. Example: "gid://shopify/MediaImage/123"'),
    alt: z.string().optional().describe('Alt text for the media'),
    previewImageSource: z.string().optional().describe('Preview image source URL')
});

const InputSchema = z.object({
    productId: z.string().describe('Product ID. Example: "gid://shopify/Product/123"'),
    media: z.array(MediaUpdateInputSchema).min(1)
});

const MediaUserErrorSchema = z.object({
    field: z.array(z.string()).optional(),
    message: z.string(),
    code: z.string().optional()
});

const MediaImageSchema = z.object({
    url: z.string().optional()
});

const MediaSchema = z.object({
    id: z.string(),
    alt: z.string().nullable().optional(),
    status: z.string().optional(),
    image: MediaImageSchema.optional()
});

const OutputSchema = z.object({
    productId: z.string().optional(),
    media: z.array(MediaSchema).optional(),
    mediaUserErrors: z.array(MediaUserErrorSchema).optional()
});

const action = createAction({
    description: 'Update media details for a Shopify product',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-product-media',
        group: 'Products'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_products'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const query = `
            mutation productUpdateMedia($productId: ID!, $media: [UpdateMediaInput!]!) {
                productUpdateMedia(productId: $productId, media: $media) {
                    product {
                        id
                    }
                    media {
                        id
                        alt
                        status
                        ... on MediaImage {
                            image {
                                url
                            }
                        }
                    }
                    mediaUserErrors {
                        field
                        message
                        code
                    }
                }
            }
        `;

        const variables = {
            productId: input.productId,
            media: input.media.map((m) => ({
                id: m.id,
                ...(m.alt !== undefined && { alt: m.alt }),
                ...(m.previewImageSource !== undefined && { previewImageSource: m.previewImageSource })
            }))
        };

        const response = await nango.post({
            // https://shopify.dev/docs/api/admin-graphql/2026-04/mutations/productUpdateMedia
            endpoint: '/admin/api/2026-04/graphql.json',
            data: {
                query,
                variables
            },
            retries: 1
        });

        const payload = z
            .object({
                data: z
                    .object({
                        productUpdateMedia: z
                            .object({
                                product: z
                                    .object({
                                        id: z.string()
                                    })
                                    .nullable()
                                    .optional(),
                                media: z.array(MediaSchema).nullable().optional(),
                                mediaUserErrors: z.array(MediaUserErrorSchema).optional()
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
            })
            .parse(response.data);

        if (payload.errors && payload.errors.length > 0) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: payload.errors.map((e) => e.message).join('; ')
            });
        }

        const result = payload.data?.productUpdateMedia;

        if (!result) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Unexpected response from Shopify GraphQL API'
            });
        }

        if (result.mediaUserErrors && result.mediaUserErrors.length > 0) {
            throw new nango.ActionError({
                type: 'shopify_error',
                message: result.mediaUserErrors.map((e) => e.message).join('; '),
                errors: result.mediaUserErrors
            });
        }

        return {
            ...(result.product?.id && { productId: result.product.id }),
            ...(result.media != null && { media: result.media }),
            ...(result.mediaUserErrors != null && { mediaUserErrors: result.mediaUserErrors })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
