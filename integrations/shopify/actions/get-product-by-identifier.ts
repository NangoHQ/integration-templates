import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    handle: z.string().optional().describe('The handle of the product. Example: "black-sunglasses"'),
    id: z.string().optional().describe('The globally-unique ID of the product. Example: "gid://shopify/Product/123"'),
    custom_id: z
        .object({
            namespace: z.string().optional(),
            key: z.string(),
            value: z.string()
        })
        .optional()
        .describe('The custom ID of the product using a unique metafield value.')
});

const GraphQLErrorSchema = z.object({
    message: z.string(),
    extensions: z.record(z.string(), z.unknown()).optional()
});

const GraphQLResponseSchema = z.object({
    data: z
        .object({
            productByIdentifier: z.unknown().nullable()
        })
        .nullable()
        .optional(),
    errors: z.array(GraphQLErrorSchema).optional()
});

const PriceSchema = z.object({
    amount: z.string(),
    currencyCode: z.string()
});

const PriceRangeSchema = z.object({
    minVariantPrice: PriceSchema,
    maxVariantPrice: PriceSchema
});

const OptionSchema = z.object({
    name: z.string(),
    values: z.array(z.string())
});

const VariantSchema = z.object({
    id: z.string(),
    title: z.string(),
    sku: z.string().nullable(),
    price: z.string(),
    position: z.number().nullable()
});

const MediaImageSchema = z.object({
    url: z.string()
});

const MediaPreviewSchema = z.object({
    image: MediaImageSchema.nullable()
});

const FeaturedMediaSchema = z.object({
    preview: MediaPreviewSchema.nullable()
});

const SeoSchema = z.object({
    title: z.string().nullable(),
    description: z.string().nullable()
});

const ProviderProductSchema = z.object({
    id: z.string(),
    title: z.string(),
    handle: z.string(),
    description: z.string(),
    descriptionHtml: z.string(),
    status: z.string(),
    productType: z.string(),
    vendor: z.string().nullable(),
    tags: z.array(z.string()),
    createdAt: z.string(),
    updatedAt: z.string(),
    publishedAt: z.string().nullable(),
    totalInventory: z.number().nullable(),
    tracksInventory: z.boolean(),
    options: z.array(OptionSchema),
    variants: z.object({
        nodes: z.array(VariantSchema)
    }),
    featuredMedia: FeaturedMediaSchema.nullable(),
    seo: SeoSchema.nullable(),
    priceRangeV2: PriceRangeSchema.nullable(),
    isGiftCard: z.boolean(),
    hasOnlyDefaultVariant: z.boolean(),
    onlineStoreUrl: z.string().nullable(),
    templateSuffix: z.string().nullable()
});

const OutputSchema = z.object({
    id: z.string(),
    title: z.string(),
    handle: z.string(),
    description: z.string(),
    descriptionHtml: z.string(),
    status: z.string(),
    productType: z.string(),
    vendor: z.string().optional(),
    tags: z.array(z.string()),
    createdAt: z.string(),
    updatedAt: z.string(),
    publishedAt: z.string().optional(),
    totalInventory: z.number().optional(),
    tracksInventory: z.boolean(),
    options: z.array(
        z.object({
            name: z.string(),
            values: z.array(z.string())
        })
    ),
    variants: z.array(
        z.object({
            id: z.string(),
            title: z.string(),
            sku: z.string().optional(),
            price: z.string(),
            position: z.number().optional()
        })
    ),
    featuredMedia: z
        .object({
            preview: z
                .object({
                    image: z.object({
                        url: z.string()
                    })
                })
                .optional()
        })
        .optional(),
    seo: z
        .object({
            title: z.string().optional(),
            description: z.string().optional()
        })
        .optional(),
    priceRangeV2: z
        .object({
            minVariantPrice: z.object({
                amount: z.string(),
                currencyCode: z.string()
            }),
            maxVariantPrice: z.object({
                amount: z.string(),
                currencyCode: z.string()
            })
        })
        .optional(),
    isGiftCard: z.boolean(),
    hasOnlyDefaultVariant: z.boolean(),
    onlineStoreUrl: z.string().optional(),
    templateSuffix: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a Shopify product by handle or another supported identifier.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-product-by-identifier',
        group: 'Products'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_products'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (!input.handle && !input.id && !input.custom_id) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'At least one of handle, id, or custom_id must be provided.'
            });
        }

        const identifier: Record<string, unknown> = {};
        if (input.handle) {
            identifier['handle'] = input.handle;
        }
        if (input.id) {
            identifier['id'] = input.id;
        }
        if (input.custom_id) {
            identifier['customId'] = {
                ...(input.custom_id.namespace !== undefined && { namespace: input.custom_id.namespace }),
                key: input.custom_id.key,
                value: input.custom_id.value
            };
        }

        const query = `
            query getProductByIdentifier($identifier: ProductIdentifierInput!) {
                productByIdentifier(identifier: $identifier) {
                    id
                    title
                    handle
                    description
                    descriptionHtml
                    status
                    productType
                    vendor
                    tags
                    createdAt
                    updatedAt
                    publishedAt
                    totalInventory
                    tracksInventory
                    options {
                        name
                        values
                    }
                    variants(first: 10) {
                        nodes {
                            id
                            title
                            sku
                            price
                            position
                        }
                    }
                    featuredMedia {
                        preview {
                            image {
                                url
                            }
                        }
                    }
                    seo {
                        title
                        description
                    }
                    priceRangeV2 {
                        minVariantPrice {
                            amount
                            currencyCode
                        }
                        maxVariantPrice {
                            amount
                            currencyCode
                        }
                    }
                    isGiftCard
                    hasOnlyDefaultVariant
                    onlineStoreUrl
                    templateSuffix
                }
            }
        `;

        const response = await nango.post({
            // https://shopify.dev/docs/api/admin-graphql/2025-04/queries/productByIdentifier
            endpoint: '/admin/api/2025-04/graphql.json',
            data: {
                query,
                variables: {
                    identifier
                }
            },
            retries: 3
        });

        const parsedResponse = GraphQLResponseSchema.safeParse(response.data);
        if (!parsedResponse.success) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Unexpected response structure from Shopify GraphQL API.'
            });
        }

        if (parsedResponse.data.errors && parsedResponse.data.errors.length > 0) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: 'GraphQL errors returned by Shopify.',
                errors: parsedResponse.data.errors
            });
        }

        const product = parsedResponse.data.data?.productByIdentifier;
        if (!product) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Product not found for the given identifier.'
            });
        }

        const parsed = ProviderProductSchema.parse(product);

        const featuredMedia =
            parsed.featuredMedia != null && parsed.featuredMedia.preview != null && parsed.featuredMedia.preview.image != null
                ? {
                      preview: {
                          image: {
                              url: parsed.featuredMedia.preview.image.url
                          }
                      }
                  }
                : undefined;

        return {
            id: parsed.id,
            title: parsed.title,
            handle: parsed.handle,
            description: parsed.description,
            descriptionHtml: parsed.descriptionHtml,
            status: parsed.status,
            productType: parsed.productType,
            ...(parsed.vendor != null && { vendor: parsed.vendor }),
            tags: parsed.tags,
            createdAt: parsed.createdAt,
            updatedAt: parsed.updatedAt,
            ...(parsed.publishedAt != null && { publishedAt: parsed.publishedAt }),
            ...(parsed.totalInventory != null && { totalInventory: parsed.totalInventory }),
            tracksInventory: parsed.tracksInventory,
            options: parsed.options.map((opt) => ({
                name: opt.name,
                values: opt.values
            })),
            variants: parsed.variants.nodes.map((v) => ({
                id: v.id,
                title: v.title,
                ...(v.sku != null && { sku: v.sku }),
                price: v.price,
                ...(v.position != null && { position: v.position })
            })),
            ...(featuredMedia !== undefined && { featuredMedia }),
            ...(parsed.seo != null && {
                seo: {
                    ...(parsed.seo.title != null && { title: parsed.seo.title }),
                    ...(parsed.seo.description != null && { description: parsed.seo.description })
                }
            }),
            ...(parsed.priceRangeV2 != null && {
                priceRangeV2: {
                    minVariantPrice: parsed.priceRangeV2.minVariantPrice,
                    maxVariantPrice: parsed.priceRangeV2.maxVariantPrice
                }
            }),
            isGiftCard: parsed.isGiftCard,
            hasOnlyDefaultVariant: parsed.hasOnlyDefaultVariant,
            ...(parsed.onlineStoreUrl != null && { onlineStoreUrl: parsed.onlineStoreUrl }),
            ...(parsed.templateSuffix != null && { templateSuffix: parsed.templateSuffix })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
