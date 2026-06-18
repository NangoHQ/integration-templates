import { createAction } from 'nango';
import { z } from 'zod';

const DEFAULT_FIELDS = [
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

type Video = z.infer<typeof VideoSchema>;

const InputSchema = z.object({
    cursor: z.number().optional(),
    max_count: z.number().optional(),
    fields: z.array(z.string()).optional()
});

const OutputSchema = z.object({
    videos: z.array(VideoSchema),
    cursor: z.number().optional(),
    has_more: z.boolean().optional()
});

const ResponseSchema = z.object({
    data: z
        .object({
            videos: z.array(z.object({}).passthrough()),
            cursor: z.number().optional(),
            has_more: z.boolean().optional()
        })
        .optional(),
    error: z
        .object({
            code: z.string(),
            message: z.string().optional(),
            log_id: z.string().optional()
        })
        .optional()
});

export default createAction({
    description: 'List videos from TikTok Accounts',
    version: '0.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['video.list'],
    exec: async (nango, input) => {
        const fields = input.fields && input.fields.length > 0 ? input.fields : DEFAULT_FIELDS;
        const requestBody: { cursor?: number; max_count?: number } = {};
        if (input.cursor !== undefined) {
            requestBody.cursor = input.cursor;
        }
        if (input.max_count !== undefined) {
            requestBody.max_count = input.max_count;
        }

        // https://developers.tiktok.com/doc/tiktok-api-v2-video-list
        const response = await nango.post({
            endpoint: 'v2/video/list/',
            params: {
                fields: fields.join(',')
            },
            data: requestBody,
            retries: 3
        });

        const parsed = ResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            await nango.log('Unexpected response structure from TikTok video list', { level: 'error' });
            throw new nango.ActionError({
                message: 'Unexpected response structure from TikTok video list'
            });
        }

        const responseData = parsed.data;
        if (responseData.error && responseData.error.code !== 'ok') {
            throw new nango.ActionError({
                message: responseData.error.message || `TikTok API error: ${responseData.error.code}`,
                code: responseData.error.code,
                log_id: responseData.error.log_id
            });
        }

        if (!responseData.data) {
            return { videos: [], cursor: undefined, has_more: false };
        }

        const videos = responseData.data.videos
            .map((video: unknown) => {
                const videoParse = VideoSchema.safeParse(video);
                return videoParse.success ? videoParse.data : null;
            })
            .filter((video: Video | null): video is Video => video !== null);

        return {
            videos,
            cursor: responseData.data.cursor,
            has_more: responseData.data.has_more
        };
    }
});
