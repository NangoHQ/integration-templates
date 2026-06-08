import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const VariantSchema = z.object({
    id: z.string(),
    title: z.string().optional(),
    sku: z.string().optional(),
    price: z.string().optional(),
    compareAtPrice: z.string().optional().nullable(),
    inventoryQuantity: z.number().optional().nullable(),
    barcode: z.string().optional().nullable(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional()
});

const ProductOptionSchema = z.object({
    id: z.string().optional(),
    name: z.string().optional(),
    values: z.array(z.string()).optional()
});

const ProductCategorySchema = z.object({
    id: z.string().optional(),
    name: z.string().optional()
});

const SEOSchema = z.object({
    title: z.string().optional().nullable(),
    description: z.string().optional().nullable()
});

const ProductSchema = z.object({
    id: z.string(),
    title: z.string().optional(),
    handle: z.string().optional(),
    description: z.string().optional(),
    vendor: z.string().optional(),
    productType: z.string().optional(),
    status: z.string().optional(),
    tags: z.array(z.string()).optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    publishedAt: z.string().optional(),
    category: ProductCategorySchema.optional(),
    seo: SEOSchema.optional(),
    options: z.array(ProductOptionSchema).optional(),
    variants: z.array(VariantSchema).optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string(),
    cursor: z.string()
});

const ProductEdgeSchema = z.object({
    node: z.object({
        id: z.string(),
        title: z.string(),
        handle: z.string(),
        description: z.string().nullish(),
        vendor: z.string().nullish(),
        productType: z.string().nullish(),
        status: z.string(),
        tags: z.array(z.string()),
        createdAt: z.string(),
        updatedAt: z.string(),
        publishedAt: z.string().nullish(),
        category: z
            .object({
                id: z.string().nullish(),
                name: z.string().nullish()
            })
            .nullish(),
        seo: z
            .object({
                title: z.string().nullish(),
                description: z.string().nullish()
            })
            .nullish(),
        options: z
            .array(
                z.object({
                    id: z.string().nullish(),
                    name: z.string().nullish(),
                    values: z.array(z.string()).nullish()
                })
            )
            .nullish(),
        variants: z
            .object({
                edges: z
                    .array(
                        z.object({
                            node: z.object({
                                id: z.string(),
                                title: z.string(),
                                sku: z.string().nullish(),
                                price: z.string().nullish(),
                                compareAtPrice: z.string().nullish(),
                                inventoryQuantity: z.number().nullish(),
                                barcode: z.string().nullish(),
                                createdAt: z.string(),
                                updatedAt: z.string()
                            })
                        })
                    )
                    .nullish()
            })
            .nullish()
    }),
    cursor: z.string()
});

const sync = createSync({
    description: 'Sync Shopify products with variants, tags, status, and merchandising fields.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Product: ProductSchema
    },
    endpoints: [
        {
            path: '/syncs/products',
            method: 'POST'
        }
    ],

    exec: async (nango) => {
        const checkpoint = CheckpointSchema.parse((await nango.getCheckpoint()) ?? { updated_after: '', cursor: '' });
        const updatedAfter = checkpoint.updated_after || undefined;
        let cursor = checkpoint.cursor || undefined;
        const queryFilter = updatedAfter ? `updated_at:>${updatedAfter}` : '';

        const proxyConfig: ProxyConfiguration = {
            // https://shopify.dev/docs/api/admin-graphql/latest/queries/products
            endpoint: '/admin/api/2025-01/graphql.json',
            method: 'POST',
            data: {
                query: `
                    query GetProducts($first: Int!, $after: String, $query: String) {
                        products(first: $first, after: $after, query: $query, sortKey: UPDATED_AT) {
                            edges {
                                node {
                                    id
                                    title
                                    handle
                                    description
                                    vendor
                                    productType
                                    status
                                    tags
                                    createdAt
                                    updatedAt
                                    publishedAt
                                    category {
                                        id
                                        name
                                    }
                                    seo {
                                        title
                                        description
                                    }
                                    options {
                                        id
                                        name
                                        values
                                    }
                                    variants(first: 100) {
                                        edges {
                                            node {
                                                id
                                                title
                                                sku
                                                price
                                                compareAtPrice
                                                inventoryQuantity
                                                barcode
                                                createdAt
                                                updatedAt
                                            }
                                        }
                                    }
                                }
                                cursor
                            }
                            pageInfo {
                                hasNextPage
                                endCursor
                            }
                        }
                    }
                `,
                variables: {
                    first: 50,
                    ...(cursor && { after: cursor }),
                    query: queryFilter
                }
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'variables.after',
                cursor_path_in_response: 'data.products.pageInfo.endCursor',
                response_path: 'data.products.edges',
                limit_name_in_request: 'variables.first',
                limit: 50,
                on_page: async ({ nextPageParam }) => {
                    cursor = typeof nextPageParam === 'string' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        let maxUpdatedAt: string | undefined;

        for await (const page of nango.paginate(proxyConfig)) {
            const edges = z.array(z.unknown()).parse(page);
            const products = [];

            for (const edge of edges) {
                const parsedEdge = ProductEdgeSchema.safeParse(edge);
                if (!parsedEdge.success) {
                    throw new Error('Invalid product edge from Shopify GraphQL');
                }

                const node = parsedEdge.data.node;
                const variants = [];
                if (node.variants?.edges) {
                    for (const variantEdge of node.variants.edges) {
                        const variant = variantEdge.node;
                        variants.push({
                            id: variant.id,
                            ...(variant.title != null && { title: variant.title }),
                            ...(variant.sku != null && { sku: variant.sku }),
                            ...(variant.price != null && { price: variant.price }),
                            ...(variant.compareAtPrice != null && { compareAtPrice: variant.compareAtPrice }),
                            ...(variant.inventoryQuantity != null && { inventoryQuantity: variant.inventoryQuantity }),
                            ...(variant.barcode != null && { barcode: variant.barcode }),
                            ...(variant.createdAt != null && { createdAt: variant.createdAt }),
                            ...(variant.updatedAt != null && { updatedAt: variant.updatedAt })
                        });
                    }
                }

                products.push({
                    id: node.id,
                    ...(node.title != null && { title: node.title }),
                    ...(node.handle != null && { handle: node.handle }),
                    ...(node.description != null && { description: node.description }),
                    ...(node.vendor != null && { vendor: node.vendor }),
                    ...(node.productType != null && { productType: node.productType }),
                    ...(node.status != null && { status: node.status }),
                    ...(node.tags != null && { tags: node.tags }),
                    ...(node.createdAt != null && { createdAt: node.createdAt }),
                    ...(node.updatedAt != null && { updatedAt: node.updatedAt }),
                    ...(node.publishedAt != null && { publishedAt: node.publishedAt }),
                    ...(node.category != null && {
                        category: {
                            ...(node.category.id != null && { id: node.category.id }),
                            ...(node.category.name != null && { name: node.category.name })
                        }
                    }),
                    ...(node.seo != null && {
                        seo: {
                            ...(node.seo.title != null && { title: node.seo.title }),
                            ...(node.seo.description != null && { description: node.seo.description })
                        }
                    }),
                    ...(node.options != null && {
                        options: node.options.map((opt) => ({
                            ...(opt.id != null && { id: opt.id }),
                            ...(opt.name != null && { name: opt.name }),
                            ...(opt.values != null && { values: opt.values })
                        }))
                    }),
                    ...(variants.length > 0 && { variants })
                });

                if (node.updatedAt) {
                    if (maxUpdatedAt === undefined || node.updatedAt > maxUpdatedAt) {
                        maxUpdatedAt = node.updatedAt;
                    }
                }
            }

            if (products.length > 0) {
                await nango.batchSave(products, 'Product');
            }

            if (cursor !== undefined) {
                await nango.saveCheckpoint({
                    updated_after: updatedAfter || '',
                    cursor
                });
            }
        }

        if (maxUpdatedAt) {
            await nango.saveCheckpoint({ updated_after: maxUpdatedAt, cursor: '' });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
