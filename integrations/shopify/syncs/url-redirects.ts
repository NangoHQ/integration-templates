import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const UrlRedirectSchema = z.object({
    id: z.string(),
    path: z.string(),
    target: z.string()
});

const CheckpointSchema = z.object({
    cursor: z.string()
});

const sync = createSync({
    description: 'Sync Shopify URL redirects for storefront migration and SEO workflows.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    scopes: ['read_online_store_navigation'],
    models: {
        UrlRedirect: UrlRedirectSchema
    },
    // https://shopify.dev/docs/api/admin-graphql/2026-07/queries/urlRedirects
    endpoints: [
        {
            method: 'POST',
            path: '/syncs/url-redirects'
        }
    ],

    exec: async (nango) => {
        const checkpoint = CheckpointSchema.parse((await nango.getCheckpoint()) ?? { cursor: '' });
        let cursor = checkpoint.cursor || undefined;

        // Blocker: Shopify UrlRedirect has no updated_at field and the urlRedirects
        // query does not support filtering by modification time. Only created_at,
        // id, path, and target filters are available, so incremental sync is not
        // possible. A full refresh is required.
        await nango.trackDeletesStart('UrlRedirect');

        const providerNodeSchema = z.object({
            id: z.string(),
            path: z.string(),
            target: z.string()
        });

        const proxyConfig: ProxyConfiguration = {
            // https://shopify.dev/docs/api/admin-graphql/2026-07/queries/urlRedirects
            endpoint: '/admin/api/2026-07/graphql.json',
            method: 'POST',
            data: {
                query: `
                    query urlRedirects($first: Int!, $after: String) {
                        urlRedirects(first: $first, after: $after) {
                            nodes {
                                id
                                path
                                target
                            }
                            pageInfo {
                                hasNextPage
                                endCursor
                            }
                        }
                    }
                `,
                variables: {
                    first: 2,
                    ...(cursor && { after: cursor })
                }
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'variables.after',
                cursor_path_in_response: 'data.urlRedirects.pageInfo.endCursor',
                response_path: 'data.urlRedirects.nodes',
                limit_name_in_request: 'variables.first',
                limit: 2,
                on_page: async ({ nextPageParam }) => {
                    cursor = typeof nextPageParam === 'string' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const redirects = [];

            for (const item of page) {
                const parsed = providerNodeSchema.safeParse(item);
                if (!parsed.success) {
                    throw new Error(`Invalid url redirect node: ${parsed.error.message}`);
                }

                redirects.push({
                    id: parsed.data.id,
                    path: parsed.data.path,
                    target: parsed.data.target
                });
            }

            if (redirects.length > 0) {
                await nango.batchSave(redirects, 'UrlRedirect');
            }

            if (cursor !== undefined) {
                await nango.saveCheckpoint({ cursor });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('UrlRedirect');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
