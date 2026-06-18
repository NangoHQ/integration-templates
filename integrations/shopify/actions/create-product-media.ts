import { z } from 'zod';
import { createAction } from 'nango';

const MediaInputSchema = z.object({
    alt: z.string().optional().describe('Alt text for the media'),
    mediaContentType: z.string().describe('Media content type. Examples: IMAGE, EXTERNAL_VIDEO, VIDEO, MODEL_3D'),
    originalSource: z.string().describe('Original source URL of the media object')
});

const InputSchema = z.object({
    productId: z.string().describe('Shopify product ID. Example: gid://shopify/Product/121709582'),
    media: z.array(MediaInputSchema).describe('List of media inputs to attach to the product')
});

const MediaImageSchema = z.object({
    url: z.string().optional()
});

const MediaSchema = z.object({
    id: z.string().optional(),
    alt: z.string().optional(),
    mediaContentType: z.string().optional(),
    status: z.string().optional(),
    image: MediaImageSchema.nullable().optional()
});

const MediaUserErrorSchema = z.object({
    field: z.array(z.string()).optional(),
    message: z.string()
});

const ProductSchema = z.object({
    id: z.string(),
    title: z.string().optional()
});

const OutputSchema = z.object({
    media: z.array(MediaSchema).optional(),
    mediaUserErrors: z.array(MediaUserErrorSchema).optional(),
    product: ProductSchema.optional()
});

const GraphQLResponseSchema = z.object({
    data: z
        .object({
            productCreateMedia: z
                .object({
                    media: z.array(MediaSchema).optional(),
                    mediaUserErrors: z.array(MediaUserErrorSchema),
                    product: ProductSchema.optional()
                })
                .optional()
        })
        .optional(),
    errors: z
        .array(
            z.object({
                message: z.string()
            })
        )
        .optional()
});

const action = createAction({
    description: 'Attach media to an existing Shopify product',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_products'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://shopify.dev/docs/api/admin-graphql/latest/mutations/productCreateMedia
            endpoint: '/admin/api/2026-04/graphql.json',
            data: {
                query: `
                    mutation productCreateMedia($media: [CreateMediaInput!]!, $productId: ID!) {
                        productCreateMedia(media: $media, productId: $productId) {
                            media {
                                id
                                alt
                                mediaContentType
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
                            }
                            product {
                                id
                                title
                            }
                        }
                    }
                `,
                variables: {
                    productId: input.productId,
                    media: input.media
                }
            },
            retries: 3
        });

        const body = GraphQLResponseSchema.parse(response.data);
        const payload = body.data?.productCreateMedia;

        if (!payload) {
            if (body.errors && body.errors.length > 0) {
                throw new nango.ActionError({
                    type: 'graphql_error',
                    message: body.errors.map((e) => e.message).join(', ')
                });
            }

            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Shopify GraphQL API'
            });
        }

        return {
            ...(payload.media != null && payload.media.length > 0 && { media: payload.media }),
            ...(payload.mediaUserErrors.length > 0 && { mediaUserErrors: payload.mediaUserErrors }),
            ...(payload.product != null && { product: payload.product })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
