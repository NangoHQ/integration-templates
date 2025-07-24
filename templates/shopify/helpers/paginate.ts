import type { NangoSync, ProxyConfiguration } from "nango";
import { buildGraphQLQuery } from './query-builder.js';
import type { ShopifyPaginationParams, ShopifyResponse, PageInfo } from '../types.js';

const BATCH_SIZE = 100;

export async function* paginate(nango: NangoSync, tableName: string, topLevelFields: string[], paginatedFields: { field: string; fields: string[] }[]) {
    let cursor: string | null = null;
    let hasNextPage = true;
    let batch: any[] = [];

    const lastSyncDate = nango.lastSyncDate || undefined;

    do {
        const variables: ShopifyPaginationParams = { first: 250, after: cursor };
        for (const { field } of paginatedFields) {
            variables[`${field}After`] = null;
            variables[`${field}First`] = 250;
        }

        const query = buildGraphQLQuery(tableName, topLevelFields, paginatedFields, lastSyncDate);
        const config: ProxyConfiguration = {
            // https://shopify.dev/docs/api/admin-graphql
            endpoint: `/admin/api/2024-01/graphql.json`,
            data: { query, variables },
            retries: 10
        };

        const response = await nango.post<ShopifyResponse>(config);

        if (response.data.errors) {
            throw new Error(JSON.stringify(response.data.errors, null, 2));
        }

        const edges = response.data['data']?.[tableName]?.edges || [];
        const pageInfo: PageInfo = response.data['data']?.[tableName]?.pageInfo ?? { hasNextPage: false, endCursor: null };

        hasNextPage = pageInfo.hasNextPage;

        for (const edge of edges) {
            const node = edge.node;
            for (const { field } of paginatedFields) {
                let nestedCursor: string | null = node[field]?.pageInfo?.endCursor || null;
                let nestedHasNextPage = node[field]?.pageInfo?.hasNextPage || false;
                node[field] = node[field]?.edges?.map((e: any) => e.node) || [];

                while (nestedHasNextPage) {
                    variables[`${field}After`] = nestedCursor;
                    const nestedQuery = buildGraphQLQuery(tableName, topLevelFields, paginatedFields, lastSyncDate);
                    const nestedConfig: ProxyConfiguration = {
                        // https://shopify.dev/docs/api/admin-graphql
                        endpoint: `/admin/api/2024-01/graphql.json`,
                        data: { query: nestedQuery, variables },
                        retries: 10
                    };

                    const nestedResponse = await nango.post<ShopifyResponse>(nestedConfig);

                    if (nestedResponse.data.errors) {
                        throw new Error(JSON.stringify(nestedResponse.data.errors, null, 2));
                    }

                    const nestedEdges = nestedResponse.data['data']?.[tableName]?.edges || [];
                    node[field].push(...nestedEdges.flatMap((e: any) => e.node[field]?.edges.map((edge: any) => edge.node) || []));

                    const newNestedPageInfo = nestedEdges.length > 0 ? nestedEdges[nestedEdges.length - 1]?.node?.[field]?.pageInfo : {};
                    nestedHasNextPage = newNestedPageInfo.hasNextPage || false;
                    nestedCursor = newNestedPageInfo.endCursor || null;
                }
            }

            batch.push(node);

            if (batch.length >= BATCH_SIZE) {
                yield batch;
                batch = [];
            }
        }
        cursor = pageInfo.endCursor;
    } while (hasNextPage);
    if (batch.length > 0) {
        yield batch;
    }
}
