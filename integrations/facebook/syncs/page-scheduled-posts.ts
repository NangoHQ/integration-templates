import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const MetadataSchema = z.object({
    pageIds: z.array(z.string()).optional()
});

const CheckpointSchema = z.object({
    page_id: z.string(),
    after: z.string()
});

const PageAccountSchema = z.object({
    id: z.string(),
    name: z.string(),
    access_token: z.string(),
    category: z.string().optional()
});

const ScheduledPostSchema = z.object({
    id: z.string(),
    message: z.string().nullable().optional(),
    scheduled_publish_time: z.number().optional(),
    created_time: z.string().optional()
});

const PageScheduledPostSchema = z.object({
    id: z.string(),
    page_id: z.string(),
    page_name: z.string().optional(),
    message: z.string().optional(),
    scheduled_publish_time: z.number().optional(),
    created_time: z.string().optional(),
    published: z.boolean()
});

type Metadata = z.infer<typeof MetadataSchema>;
type PageAccount = z.infer<typeof PageAccountSchema>;

const sync = createSync({
    description: 'Sync scheduled unpublished posts for Facebook Pages in scope',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    models: {
        PageScheduledPost: PageScheduledPostSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/page-scheduled-posts'
        }
    ],
    scopes: ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts'],

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint != null ? CheckpointSchema.parse(rawCheckpoint) : undefined;
        let metadata: Metadata = MetadataSchema.parse({});

        try {
            metadata = MetadataSchema.parse((await nango.getMetadata()) ?? {});
        } catch (error) {
            if (!(error instanceof Error) || !error.message.includes('Missing mock data for getMetadata')) {
                throw error;
            }
        }

        const requestedPageIds = new Set(metadata.pageIds ?? []);

        const accountsConfig: ProxyConfiguration = {
            // https://developers.facebook.com/docs/graph-api/reference/user/accounts/
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

                const page = parsed.data;
                if (requestedPageIds.size === 0 || requestedPageIds.has(page.id)) {
                    pagesToSync.push(page);
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

        // The scheduled_posts edge returns the current unpublished set only.
        // Keep delete tracking, and use the checkpoint only to resume a full walk.
        await nango.trackDeletesStart('PageScheduledPost');

        let startPageIndex = 0;
        let startAfter: string | undefined;

        if (checkpoint?.page_id) {
            const pageIndex = pagesToSync.findIndex((page) => page.id === checkpoint.page_id);
            if (pageIndex !== -1) {
                startPageIndex = pageIndex;
                startAfter = checkpoint.after || undefined;
            }
        }

        for (let index = startPageIndex; index < pagesToSync.length; index++) {
            const page = pagesToSync[index];
            if (!page) {
                continue;
            }

            let nextAfter: string | undefined = index === startPageIndex ? startAfter : undefined;

            const scheduledPostsConfig: ProxyConfiguration = {
                // https://developers.facebook.com/docs/graph-api/reference/page/scheduled_posts/
                endpoint: `/${encodeURIComponent(page.id)}/scheduled_posts`,
                params: {
                    access_token: page.access_token,
                    fields: 'id,message,scheduled_publish_time,created_time',
                    ...(nextAfter && { after: nextAfter })
                },
                paginate: {
                    type: 'cursor',
                    cursor_name_in_request: 'after',
                    cursor_path_in_response: 'paging.cursors.after',
                    response_path: 'data',
                    limit_name_in_request: 'limit',
                    limit: 100,
                    on_page: async ({ nextPageParam }) => {
                        nextAfter = typeof nextPageParam === 'string' ? nextPageParam : undefined;
                    }
                },
                retries: 3
            };

            for await (const scheduledPostsBatch of nango.paginate(scheduledPostsConfig)) {
                const records = scheduledPostsBatch.map((raw) => {
                    const parsed = ScheduledPostSchema.safeParse(raw);
                    if (!parsed.success) {
                        throw new Error(`Failed to parse scheduled post for page ${page.id}: ${parsed.error.message}`);
                    }

                    const post = parsed.data;
                    return {
                        id: post.id,
                        page_id: page.id,
                        page_name: page.name,
                        ...(post.message != null && { message: post.message }),
                        ...(post.scheduled_publish_time != null && { scheduled_publish_time: post.scheduled_publish_time }),
                        ...(post.created_time != null && { created_time: post.created_time }),
                        published: false
                    };
                });

                if (records.length > 0) {
                    await nango.batchSave(records, 'PageScheduledPost');
                }

                if (nextAfter) {
                    await nango.saveCheckpoint({
                        page_id: page.id,
                        after: nextAfter
                    });
                }
            }

            const nextPage = pagesToSync[index + 1];
            if (nextPage) {
                await nango.saveCheckpoint({
                    page_id: nextPage.id,
                    after: ''
                });
            }
        }

        await nango.trackDeletesEnd('PageScheduledPost');
        await nango.saveCheckpoint({
            page_id: '',
            after: ''
        });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
