import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const CollectionSchema = z.object({
    id: z.string(),
    title: z.string().optional(),
    handle: z.string().optional(),
    description: z.string().optional(),
    updated_at: z.string().optional(),
    sort_order: z.string().optional(),
    collection_type: z.string().optional(),
    published_on_current_publication: z.boolean().optional(),
    template_suffix: z.string().optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string(),
    cursor: z.string()
});

const sync = createSync({
    description: 'Sync Shopify collections with pagination and optional search filters.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Collection: CollectionSchema
    },
    endpoints: [
        // https://shopify.dev/docs/api/admin-graphql/2024-10/queries/collections
        {
            method: 'POST',
            path: '/syncs/collections'
        }
    ],

    exec: async (nango) => {
        const checkpoint = (await nango.getCheckpoint()) ?? { updated_after: '', cursor: '' };

        let updatedAfter = checkpoint.updated_after;
        let cursor = checkpoint.cursor;
        const queryFilter = updatedAfter ? "updated_at:>'" + updatedAfter + "'" : undefined;

        const proxyConfig: ProxyConfiguration = {
            // https://shopify.dev/docs/api/admin-graphql/2024-10/queries/collections
            endpoint: '/admin/api/2024-10/graphql.json',
            method: 'POST',
            data: {
                query: `
                    query Collections($first: Int!, $after: String, $query: String) {
                        collections(first: $first, after: $after, query: $query, sortKey: UPDATED_AT) {
                            nodes {
                                id
                                title
                                handle
                                descriptionHtml
                                updatedAt
                                sortOrder
                                templateSuffix
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
                    ...(queryFilter && { query: queryFilter })
                }
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'variables.after',
                cursor_path_in_response: 'data.collections.pageInfo.endCursor',
                response_path: 'data.collections.nodes',
                limit_name_in_request: 'variables.first',
                limit: 50,
                on_page: async ({ nextPageParam }: { nextPageParam?: string | number | undefined }) => {
                    cursor = typeof nextPageParam === 'string' ? nextPageParam : '';
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const collections = page.map(
                (record: {
                    id: string;
                    title?: string | null;
                    handle?: string | null;
                    descriptionHtml?: string | null;
                    updatedAt?: string | null;
                    sortOrder?: string | null;
                    templateSuffix?: string | null;
                }) => ({
                    id: record.id,
                    ...(record.title != null && { title: record.title }),
                    ...(record.handle != null && { handle: record.handle }),
                    ...(record.descriptionHtml != null && { description: record.descriptionHtml }),
                    ...(record.updatedAt != null && { updated_at: record.updatedAt }),
                    ...(record.sortOrder != null && { sort_order: record.sortOrder }),
                    ...(record.templateSuffix != null && { template_suffix: record.templateSuffix })
                })
            );

            if (collections.length === 0) {
                continue;
            }

            await nango.batchSave(collections, 'Collection');

            if (cursor) {
                await nango.saveCheckpoint({
                    updated_after: updatedAfter,
                    cursor
                });
                continue;
            }

            const lastRecord = collections[collections.length - 1];
            if (!lastRecord) {
                continue;
            }
            const lastUpdatedAt = lastRecord.updated_at;
            if (lastUpdatedAt) {
                updatedAfter = lastUpdatedAt;
            }
            await nango.saveCheckpoint({ updated_after: updatedAfter, cursor: '' });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
