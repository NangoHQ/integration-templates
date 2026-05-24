import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

// Page Post model
const PagePostSchema = z.object({
    id: z.string(),
    pageId: z.string(),
    message: z.string().optional(),
    createdTime: z.string(),
    updatedTime: z.string(),
    permalinkUrl: z.string().optional(),
    statusType: z.string().optional(),
    isPublished: z.boolean().optional(),
    isHidden: z.boolean().optional()
});

const CheckpointSchema = z.object({
    updatedAfter: z.string()
});

const MetadataSchema = z.object({
    pageIds: z.array(z.string()).optional()
});

const FacebookPostSchema = z.object({
    id: z.string(),
    message: z.string().optional().nullable(),
    created_time: z.string(),
    updated_time: z.string(),
    permalink_url: z.string().optional().nullable(),
    status_type: z.string().optional().nullable(),
    is_published: z.boolean().optional().nullable(),
    is_hidden: z.boolean().optional().nullable()
});

const PageAccountSchema = z.object({
    id: z.string(),
    name: z.string(),
    access_token: z.string(),
    category: z.string().optional()
});

type PagePost = z.infer<typeof PagePostSchema>;
type PageAccount = z.infer<typeof PageAccountSchema>;

const ModelsMap = {
    PagePost: PagePostSchema
};

const sync = createSync<typeof ModelsMap, typeof MetadataSchema, typeof CheckpointSchema>({
    description: 'Sync posts from Facebook Pages the connection can access.',
    version: '1.0.0',
    endpoints: [{ method: 'POST', path: '/syncs/page-posts' }],
    frequency: 'every hour',
    autoStart: true,

    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    models: ModelsMap,

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint != null ? CheckpointSchema.parse(rawCheckpoint) : undefined;
        let metadata = MetadataSchema.parse({});

        try {
            metadata = MetadataSchema.parse((await nango.getMetadata()) ?? {});
        } catch (error) {
            if (!(error instanceof Error) || !error.message.includes('Missing mock data for getMetadata')) {
                throw error;
            }
        }

        const requestedPageIds = new Set(metadata.pageIds ?? []);

        const accountsConfig: ProxyConfiguration = {
            // https://developers.facebook.com/docs/graph-api/reference/me/accounts/
            endpoint: '/me/accounts',
            params: {
                fields: 'id,name,access_token,category'
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'after',
                cursor_path_in_response: 'paging.cursors.after',
                response_path: 'data',
                limit_name_in_request: 'limit',
                limit: 100
            },
            retries: 3
        };

        const pagesToSync: PageAccount[] = [];

        for await (const accountsBatch of nango.paginate(accountsConfig)) {
            for (const raw of accountsBatch) {
                const parsed = PageAccountSchema.safeParse(raw);
                if (!parsed.success) {
                    throw new Error(`Failed to parse page account: ${parsed.error.message}`);
                }

                const account = parsed.data;
                if (requestedPageIds.size === 0 || requestedPageIds.has(account.id)) {
                    pagesToSync.push(account);
                }
            }
        }

        if (requestedPageIds.size > 0) {
            const foundPageIds = new Set(pagesToSync.map((page) => page.id));

            for (const requestedPageId of requestedPageIds) {
                if (!foundPageIds.has(requestedPageId)) {
                    await nango.log(`Page ${requestedPageId} not found in /me/accounts, skipping`);
                }
            }
        }

        if (pagesToSync.length === 0) {
            await nango.log('No page IDs found to sync posts');
            return;
        }

        const updatedAfter = checkpoint?.updatedAfter || undefined;
        let latestUpdatedAfter = updatedAfter;

        // The feed edge supports a `since` filter, so this sync stays incremental.
        // Do not use full-refresh delete tracking here because unchanged posts are omitted.
        for (const page of pagesToSync) {
            const feedParams: Record<string, string | number> = {
                access_token: page.access_token,
                fields: 'id,message,created_time,updated_time,permalink_url,status_type,is_published,is_hidden',
                limit: 100
            };

            if (updatedAfter) {
                feedParams['since'] = Math.floor(new Date(updatedAfter).getTime() / 1000);
            }

            const feedConfig: ProxyConfiguration = {
                // https://developers.facebook.com/docs/graph-api/reference/page/feed/
                endpoint: `/${encodeURIComponent(page.id)}/feed`,
                params: feedParams,
                paginate: {
                    type: 'cursor',
                    cursor_name_in_request: 'after',
                    cursor_path_in_response: 'paging.cursors.after',
                    response_path: 'data',
                    limit_name_in_request: 'limit',
                    limit: 100
                },
                retries: 3
            };

            for await (const postsBatch of nango.paginate(feedConfig)) {
                const posts: PagePost[] = [];

                for (const raw of postsBatch) {
                    const parsed = FacebookPostSchema.safeParse(raw);
                    if (!parsed.success) {
                        throw new Error(`Failed to parse post: ${parsed.error.message}`);
                    }

                    const post = parsed.data;

                    posts.push({
                        id: post.id,
                        pageId: page.id,
                        message: post.message ?? undefined,
                        createdTime: post.created_time,
                        updatedTime: post.updated_time,
                        permalinkUrl: post.permalink_url ?? undefined,
                        statusType: post.status_type ?? undefined,
                        isPublished: post.is_published ?? undefined,
                        isHidden: post.is_hidden ?? undefined
                    });

                    if (!latestUpdatedAfter || post.updated_time > latestUpdatedAfter) {
                        latestUpdatedAfter = post.updated_time;
                    }
                }

                if (posts.length > 0) {
                    await nango.batchSave(posts, 'PagePost');
                }
            }
        }

        if (latestUpdatedAfter && latestUpdatedAfter !== updatedAfter) {
            await nango.saveCheckpoint({
                updatedAfter: latestUpdatedAfter
            });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
