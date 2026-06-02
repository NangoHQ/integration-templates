import { z } from 'zod';
import { createAction } from 'nango';

const ALL_VIDEO_FIELDS = [
    'id',
    'create_time',
    'cover_image_url',
    'share_url',
    'video_description',
    'duration',
    'height',
    'width',
    'title',
    'embed_html',
    'embed_link',
    'like_count',
    'comment_count',
    'share_count',
    'view_count'
];

const InputSchema = z.object({
    video_ids: z.array(z.string()).min(1).max(20).describe('List of TikTok video IDs to query. Maximum 20.'),
    fields: z.array(z.string()).optional().describe('Fields to return for each video. Defaults to all fields.')
});

const ProviderVideoSchema = z.object({
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

const ProviderResponseSchema = z.object({
    data: z.object({
        videos: z.array(ProviderVideoSchema)
    }),
    error: z
        .object({
            code: z.string(),
            message: z.string().optional(),
            log_id: z.string().optional()
        })
        .optional()
});

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

const OutputSchema = z.object({
    videos: z.array(VideoSchema)
});

const action = createAction({
    description: 'Fetch TikTok video details by IDs.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/query-videos',
        group: 'Videos'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['video.list'],

    exec: async (nango, input) => {
        const fields = input.fields ?? ALL_VIDEO_FIELDS.slice();
        const fieldsParam = fields.join(',');

        const response = await nango.post({
            // https://developers.tiktok.com/doc/tiktok-api-v2-video-query
            endpoint: '/v2/video/query/',
            params: {
                fields: fieldsParam
            },
            data: {
                filters: {
                    video_ids: input.video_ids
                }
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Failed to parse TikTok API response',
                details: parsed.error.message
            });
        }

        if (parsed.data.error && parsed.data.error.code !== 'ok') {
            throw new nango.ActionError({
                type: 'provider_error',
                message: parsed.data.error.message || 'TikTok API returned an error',
                code: parsed.data.error.code,
                log_id: parsed.data.error.log_id
            });
        }

        return {
            videos: parsed.data.data.videos.map((video) => ({
                id: video.id,
                ...(video.create_time !== undefined && { create_time: video.create_time }),
                ...(video.cover_image_url !== undefined && { cover_image_url: video.cover_image_url }),
                ...(video.share_url !== undefined && { share_url: video.share_url }),
                ...(video.video_description !== undefined && { video_description: video.video_description }),
                ...(video.duration !== undefined && { duration: video.duration }),
                ...(video.height !== undefined && { height: video.height }),
                ...(video.width !== undefined && { width: video.width }),
                ...(video.title !== undefined && { title: video.title }),
                ...(video.embed_html !== undefined && { embed_html: video.embed_html }),
                ...(video.embed_link !== undefined && { embed_link: video.embed_link }),
                ...(video.like_count !== undefined && { like_count: video.like_count }),
                ...(video.comment_count !== undefined && { comment_count: video.comment_count }),
                ...(video.share_count !== undefined && { share_count: video.share_count }),
                ...(video.view_count !== undefined && { view_count: video.view_count })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
