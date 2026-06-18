import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    video_id: z.string().describe('TikTok video ID. Example: "7077642457847991554"')
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
    data: z
        .object({
            videos: z.array(ProviderVideoSchema).optional()
        })
        .optional(),
    error: z
        .object({
            code: z.string(),
            message: z.string(),
            log_id: z.string().optional()
        })
        .optional()
});

const OutputSchema = z.object({
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

const action = createAction({
    description: 'Retrieve a single video from TikTok Accounts.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['video.list'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const fields =
            'id,create_time,cover_image_url,share_url,video_description,duration,height,width,title,embed_html,embed_link,like_count,comment_count,share_count,view_count';

        // https://developers.tiktok.com/doc/tiktok-api-v2-video-query
        const response = await nango.post({
            endpoint: '/v2/video/query/',
            params: {
                fields: fields
            },
            data: {
                filters: {
                    video_ids: [input.video_id]
                }
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        if (parsed.error && parsed.error.code !== 'ok') {
            throw new nango.ActionError({
                type: 'provider_error',
                message: parsed.error.message,
                code: parsed.error.code
            });
        }

        const videos = parsed.data?.videos;
        if (!videos || videos.length === 0) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Video not found',
                video_id: input.video_id
            });
        }

        const video = videos[0];
        if (video === undefined) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Video not found',
                video_id: input.video_id
            });
        }

        return {
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
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
