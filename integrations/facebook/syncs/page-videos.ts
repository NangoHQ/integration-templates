import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

// Provider schemas (snake_case to match Facebook Graph API)
const ProviderPageSchema = z.object({
    id: z.string(),
    access_token: z.string()
});

const ProviderVideoSchema = z.object({
    id: z.string(),
    title: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    created_time: z.string(),
    updated_time: z.string().optional().nullable(),
    length: z.number().optional().nullable(),
    permalink_url: z.string().optional().nullable(),
    picture: z.string().optional().nullable(),
    source: z.string().optional().nullable(),
    views: z.number().optional().nullable()
});

// Sync model schema
const PageVideoSchema = z.object({
    id: z.string(),
    page_id: z.string(),
    title: z.string().optional(),
    description: z.string().optional(),
    created_time: z.string(),
    updated_time: z.string().optional(),
    length: z.number().optional(),
    permalink_url: z.string().optional(),
    picture: z.string().optional(),
    source: z.string().optional(),
    views: z.number().optional()
});

const CheckpointSchema = z.object({
    page_id: z.string(),
    after: z.string()
});

type ProviderPage = z.infer<typeof ProviderPageSchema>;

const sync = createSync({
    description: 'Sync videos published on Facebook Pages in scope.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        PageVideo: PageVideoSchema
    },
    endpoints: [{ method: 'GET', path: '/syncs/page-videos' }],
    checkpoint: CheckpointSchema,

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint != null ? CheckpointSchema.parse(rawCheckpoint) : undefined;

        const pagesConfig: ProxyConfiguration = {
            // https://developers.facebook.com/docs/graph-api/reference/me/accounts/
            endpoint: '/me/accounts',
            params: {
                fields: 'id,access_token'
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

        const pagesToSync: ProviderPage[] = [];

        for await (const pagesBatch of nango.paginate(pagesConfig)) {
            for (const raw of pagesBatch) {
                const parsedPage = ProviderPageSchema.safeParse(raw);
                if (!parsedPage.success) {
                    throw new Error(`Failed to parse page account: ${parsedPage.error.message}`);
                }

                pagesToSync.push(parsedPage.data);
            }
        }

        // The page videos edge does not expose a changed-since filter in the supplied context.
        // Keep this as a full refresh, and use the checkpoint only to resume an interrupted walk.
        await nango.trackDeletesStart('PageVideo');

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

            const videosConfig: ProxyConfiguration = {
                // https://developers.facebook.com/docs/graph-api/reference/page/videos/
                endpoint: `/${encodeURIComponent(page.id)}/videos`,
                params: {
                    access_token: page.access_token,
                    fields: 'id,title,description,created_time,updated_time,length,permalink_url,picture,source,views',
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

            for await (const videosBatch of nango.paginate(videosConfig)) {
                const videos = videosBatch.map((raw) => {
                    const parsedVideo = ProviderVideoSchema.safeParse(raw);
                    if (!parsedVideo.success) {
                        throw new Error(`Failed to parse video for page ${page.id}: ${parsedVideo.error.message}`);
                    }

                    const video = parsedVideo.data;
                    return {
                        id: video.id,
                        page_id: page.id,
                        ...(video.title != null && { title: video.title }),
                        ...(video.description != null && { description: video.description }),
                        created_time: video.created_time,
                        ...(video.updated_time != null && { updated_time: video.updated_time }),
                        ...(video.length != null && { length: video.length }),
                        ...(video.permalink_url != null && { permalink_url: video.permalink_url }),
                        ...(video.picture != null && { picture: video.picture }),
                        ...(video.source != null && { source: video.source }),
                        ...(video.views != null && { views: video.views })
                    };
                });

                if (videos.length > 0) {
                    await nango.batchSave(videos, 'PageVideo');
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

        await nango.trackDeletesEnd('PageVideo');
        await nango.saveCheckpoint({
            page_id: '',
            after: ''
        });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
