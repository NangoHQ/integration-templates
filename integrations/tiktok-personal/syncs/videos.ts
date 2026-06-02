import { createSync } from 'nango';
import { z } from 'zod';

const VideoSchema = z.object({
    id: z.string(),
    create_time: z.number().optional(),
    cover_image_url: z.string().optional(),
    share_url: z.string().optional(),
    video_description: z.string().optional(),
    duration: z.number().optional(),
    height: z.number().optional(),
    width: z.number().optional(),
    title: z.string().optional(),
    embed_html: z.string().optional(),
    embed_link: z.string().optional(),
    like_count: z.number().optional(),
    comment_count: z.number().optional(),
    share_count: z.number().optional(),
    view_count: z.number().optional()
});

const VideoListResponseSchema = z.object({
    data: z
        .object({
            videos: z.array(z.unknown()),
            cursor: z.number().optional(),
            has_more: z.boolean().optional()
        })
        .optional(),
    error: z
        .object({
            code: z.string(),
            message: z.string().optional()
        })
        .optional()
});

const sync = createSync({
    description: 'Sync videos from TikTok Accounts.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Video: VideoSchema
    },
    endpoints: [
        {
            method: 'POST',
            path: '/syncs/videos'
        }
    ],
    exec: async (nango) => {
        await nango.trackDeletesStart('Video');

        let hasMore = true;
        let cursor: number | undefined;

        while (hasMore) {
            // https://developers.tiktok.com/doc/tiktok-api-v2-video-list
            const response = await nango.post({
                endpoint: '/v2/video/list/',
                params: {
                    fields: 'id,create_time,cover_image_url,share_url,video_description,duration,height,width,title,embed_html,embed_link,like_count,comment_count,share_count,view_count'
                },
                data: {
                    max_count: 20,
                    ...(cursor !== undefined && { cursor })
                },
                retries: 3
            });

            const parsed = VideoListResponseSchema.safeParse(response.data);
            if (!parsed.success) {
                throw new Error(`Failed to parse video list response: ${parsed.error.message}`);
            }

            const { data } = parsed.data;
            if (!data) {
                throw new Error('Missing data in video list response');
            }

            const videos = data.videos;
            if (videos.length === 0) {
                break;
            }

            const mappedVideos = videos.map((video) => {
                const parsedVideo = VideoSchema.safeParse(video);
                if (!parsedVideo.success) {
                    throw new Error(`Failed to parse video: ${parsedVideo.error.message}`);
                }
                return parsedVideo.data;
            });

            await nango.batchSave(mappedVideos, 'Video');

            hasMore = Boolean(data.has_more);
            if (hasMore) {
                if (data.cursor === undefined) {
                    throw new Error('TikTok video list response missing cursor for next page');
                }
                cursor = data.cursor;
            }
        }

        await nango.trackDeletesEnd('Video');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
