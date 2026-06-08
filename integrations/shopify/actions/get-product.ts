import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Shopify GraphQL product ID. Example: "gid://shopify/Product/8651795562633"')
});

const ProviderVariantSchema = z.object({
    id: z.string(),
    title: z.string(),
    sku: z.string().nullable().optional(),
    price: z.string(),
    barcode: z.string().nullable().optional(),
    inventoryQuantity: z.number().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional()
});

const ProviderMediaImageSchema = z.object({
    id: z.string(),
    alt: z.string().nullable().optional(),
    image: z
        .object({
            url: z.string()
        })
        .optional()
});

const ProviderMediaVideoSchema = z.object({
    id: z.string(),
    alt: z.string().nullable().optional()
});

const ProviderProductSchema = z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().optional(),
    handle: z.string().optional(),
    productType: z.string().optional(),
    vendor: z.string().optional(),
    status: z.string().optional(),
    totalInventory: z.number().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    variants: z
        .object({
            edges: z.array(
                z.object({
                    node: ProviderVariantSchema
                })
            )
        })
        .optional(),
    media: z
        .object({
            edges: z.array(
                z.object({
                    node: z.union([ProviderMediaImageSchema, ProviderMediaVideoSchema])
                })
            )
        })
        .optional()
});

const ProviderResponseSchema = z.object({
    data: z.object({
        product: ProviderProductSchema.nullable()
    })
});

const VariantSchema = z.object({
    id: z.string(),
    title: z.string(),
    sku: z.string().optional(),
    price: z.string(),
    barcode: z.string().optional(),
    inventoryQuantity: z.number().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional()
});

const MediaSchema = z.object({
    id: z.string(),
    alt: z.string().optional(),
    url: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().optional(),
    handle: z.string().optional(),
    productType: z.string().optional(),
    vendor: z.string().optional(),
    status: z.string().optional(),
    totalInventory: z.number().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    variants: z.array(VariantSchema).optional(),
    media: z.array(MediaSchema).optional()
});

const action = createAction({
    description: 'Retrieve a Shopify product by GraphQL ID.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-product',
        group: 'Products'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_products'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://shopify.dev/docs/api/admin-graphql/2025-01/queries/product
        const response = await nango.post({
            endpoint: '/admin/api/2025-01/graphql.json',
            data: {
                query: `
                    query GetProduct($id: ID!) {
                        product(id: $id) {
                            id
                            title
                            description
                            handle
                            productType
                            vendor
                            status
                            totalInventory
                            createdAt
                            updatedAt
                            variants(first: 50) {
                                edges {
                                    node {
                                        id
                                        title
                                        sku
                                        price
                                        barcode
                                        inventoryQuantity
                                        createdAt
                                        updatedAt
                                    }
                                }
                            }
                            media(first: 50) {
                                edges {
                                    node {
                                        ... on MediaImage {
                                            id
                                            alt
                                            image {
                                                url
                                            }
                                        }
                                        ... on Video {
                                            id
                                            alt
                                        }
                                    }
                                }
                            }
                        }
                    }
                `,
                variables: {
                    id: input.id
                }
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from Shopify',
                details: parsed.error.issues
            });
        }

        const product = parsed.data.data.product;
        if (!product) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Product not found',
                id: input.id
            });
        }

        const variants =
            product.variants?.edges.map((edge) => {
                const node = edge.node;
                return {
                    id: node.id,
                    title: node.title,
                    price: node.price,
                    ...(node.sku != null && { sku: node.sku }),
                    ...(node.barcode != null && { barcode: node.barcode }),
                    ...(node.inventoryQuantity !== undefined && { inventoryQuantity: node.inventoryQuantity }),
                    ...(node.createdAt !== undefined && { createdAt: node.createdAt }),
                    ...(node.updatedAt !== undefined && { updatedAt: node.updatedAt })
                };
            }) ?? [];

        const media =
            product.media?.edges.map((edge) => {
                const node = edge.node;
                if ('image' in node && node.image?.url) {
                    return {
                        id: node.id,
                        ...(node.alt != null && { alt: node.alt }),
                        url: node.image.url
                    };
                }
                return {
                    id: node.id,
                    ...(node.alt != null && { alt: node.alt })
                };
            }) ?? [];

        return {
            id: product.id,
            title: product.title,
            ...(product.description !== undefined && { description: product.description }),
            ...(product.handle !== undefined && { handle: product.handle }),
            ...(product.productType !== undefined && { productType: product.productType }),
            ...(product.vendor !== undefined && { vendor: product.vendor }),
            ...(product.status !== undefined && { status: product.status }),
            ...(product.totalInventory !== undefined && { totalInventory: product.totalInventory }),
            ...(product.createdAt !== undefined && { createdAt: product.createdAt }),
            ...(product.updatedAt !== undefined && { updatedAt: product.updatedAt }),
            ...(variants.length > 0 && { variants }),
            ...(media.length > 0 && { media })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
