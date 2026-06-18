import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    first: z.number().int().min(1).max(250).optional().describe('Number of products to return (1-250). Default: 50.'),
    after: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    sortKey: z
        .enum(['CREATED_AT', 'ID', 'INVENTORY_TOTAL', 'PRODUCT_TYPE', 'PUBLISHED_AT', 'RELEVANCE', 'TITLE', 'UPDATED_AT', 'VENDOR'])
        .optional()
        .describe('Sort key for the product list.'),
    reverse: z.boolean().optional().describe('Reverse the order of the results.'),
    query: z.string().optional().describe('Search query string using Shopify API search syntax.')
});

const ProviderProductSchema = z.object({
    id: z.string(),
    title: z.string(),
    handle: z.string().nullish(),
    description: z.string().nullish(),
    vendor: z.string().nullish(),
    productType: z.string().nullish(),
    status: z.string().nullish(),
    tags: z.array(z.string()).nullish(),
    createdAt: z.string().nullish(),
    updatedAt: z.string().nullish(),
    publishedAt: z.string().nullish()
});

const OutputProductSchema = z.object({
    id: z.string(),
    title: z.string(),
    handle: z.string().optional(),
    description: z.string().optional(),
    vendor: z.string().optional(),
    productType: z.string().optional(),
    status: z.string().optional(),
    tags: z.array(z.string()).optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    publishedAt: z.string().optional()
});

const ProviderResponseSchema = z.object({
    data: z.object({
        products: z.object({
            nodes: z.array(z.unknown()),
            pageInfo: z.object({
                hasNextPage: z.boolean(),
                endCursor: z.string().nullable().optional()
            })
        })
    })
});

const OutputSchema = z.object({
    products: z.array(OutputProductSchema),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List Shopify products with cursor pagination and optional search query.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_products'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const graphQuery = `
            query Products($first: Int!, $after: String, $sortKey: ProductSortKeys, $reverse: Boolean, $query: String) {
                products(first: $first, after: $after, sortKey: $sortKey, reverse: $reverse, query: $query) {
                    nodes {
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
                    }
                    pageInfo {
                        hasNextPage
                        endCursor
                    }
                }
            }
        `;

        const variables = {
            first: input.first ?? 50,
            ...(input.after !== undefined && { after: input.after }),
            ...(input.sortKey !== undefined && { sortKey: input.sortKey }),
            ...(input.reverse !== undefined && { reverse: input.reverse }),
            ...(input.query !== undefined && { query: input.query })
        };

        const config: ProxyConfiguration = {
            // https://shopify.dev/docs/api/admin-graphql/latest/queries/products
            endpoint: '/admin/api/2026-04/graphql.json',
            data: {
                query: graphQuery,
                variables
            },
            retries: 3
        };

        const response = await nango.post(config);
        const parsed = ProviderResponseSchema.parse(response.data);

        const products = parsed.data.products.nodes.map((node) => {
            const product = ProviderProductSchema.parse(node);
            return {
                id: product.id,
                title: product.title,
                ...(product.handle != null && { handle: product.handle }),
                ...(product.description != null && { description: product.description }),
                ...(product.vendor != null && { vendor: product.vendor }),
                ...(product.productType != null && { productType: product.productType }),
                ...(product.status != null && { status: product.status }),
                ...(product.tags != null && { tags: product.tags }),
                ...(product.createdAt != null && { createdAt: product.createdAt }),
                ...(product.updatedAt != null && { updatedAt: product.updatedAt }),
                ...(product.publishedAt != null && { publishedAt: product.publishedAt })
            };
        });

        const nextCursor =
            parsed.data.products.pageInfo.hasNextPage && parsed.data.products.pageInfo.endCursor ? parsed.data.products.pageInfo.endCursor : undefined;

        return {
            products,
            ...(nextCursor !== undefined && { nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
