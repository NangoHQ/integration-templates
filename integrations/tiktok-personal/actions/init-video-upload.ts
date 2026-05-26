import { createAction, ProxyConfiguration } from 'nango';
import { z } from 'zod';

const PostInfoSchema = z.object({
    title: z.string().optional().describe('Video caption. Supports hashtags and @mentions. Max 2200 characters.'),
    privacy_level: z.enum(['PUBLIC_TO_EVERYONE', 'MUTUAL_FOLLOW_FRIENDS', 'FOLLOWER_OF_CREATOR', 'SELF_ONLY']).describe('Privacy level for the posted video.'),
    disable_duet: z.boolean().optional(),
    disable_stitch: z.boolean().optional(),
    disable_comment: z.boolean().optional(),
    video_cover_timestamp_ms: z.number().optional().describe('Timestamp in milliseconds for the video cover frame.'),
    brand_content_toggle: z.boolean().optional(),
    brand_organic_toggle: z.boolean().optional(),
    is_aigc: z.boolean().optional().describe('Whether the content is AI-generated.')
});

const FileUploadSourceSchema = z.object({
    source: z.literal('FILE_UPLOAD'),
    video_size: z.number().int().positive().describe('Size of the video in bytes.'),
    chunk_size: z.number().int().positive().describe('Size of each upload chunk in bytes.'),
    total_chunk_count: z.number().int().positive().describe('Total number of chunks.')
});

const PullFromUrlSourceSchema = z.object({
    source: z.literal('PULL_FROM_URL'),
    video_url: z.string().describe('URL of the video. Domain must be verified with TikTok.')
});

const SourceInfoSchema = z.union([FileUploadSourceSchema, PullFromUrlSourceSchema]);

const InputSchema = z.object({
    post_info: PostInfoSchema,
    source_info: SourceInfoSchema,
    post_mode: z.enum(['DIRECT_POST', 'MEDIA_UPLOAD']).optional().describe('DIRECT_POST to publish immediately, MEDIA_UPLOAD to send to Creator Inbox.'),
    media_type: z.literal('VIDEO').optional()
});

const ProviderResponseSchema = z.object({
    data: z.object({
        publish_id: z.string(),
        upload_url: z.string().optional(),
        post_id: z.string().optional()
    }),
    error: z.object({
        code: z.string(),
        message: z.string(),
        log_id: z.string().optional()
    })
});

const OutputSchema = z.object({
    publish_id: z.string().describe('Identifier to track the posting action.'),
    upload_url: z.string().optional().describe('URL provided by TikTok to upload the video file. Only present for FILE_UPLOAD.'),
    post_id: z.string().optional().describe('Post ID if available.')
});

const action = createAction({
    description: 'Initialize a TikTok direct video upload or pull-from-url post.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/init-video-upload',
        group: 'Content Posting'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['video.publish'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developers.tiktok.com/doc/content-posting-api-reference-direct-post
            endpoint: '/v2/post/publish/video/init/',
            data: {
                post_info: {
                    privacy_level: input.post_info.privacy_level,
                    ...(input.post_info.title !== undefined && { title: input.post_info.title }),
                    ...(input.post_info.disable_duet !== undefined && { disable_duet: input.post_info.disable_duet }),
                    ...(input.post_info.disable_stitch !== undefined && { disable_stitch: input.post_info.disable_stitch }),
                    ...(input.post_info.disable_comment !== undefined && { disable_comment: input.post_info.disable_comment }),
                    ...(input.post_info.video_cover_timestamp_ms !== undefined && { video_cover_timestamp_ms: input.post_info.video_cover_timestamp_ms }),
                    ...(input.post_info.brand_content_toggle !== undefined && { brand_content_toggle: input.post_info.brand_content_toggle }),
                    ...(input.post_info.brand_organic_toggle !== undefined && { brand_organic_toggle: input.post_info.brand_organic_toggle }),
                    ...(input.post_info.is_aigc !== undefined && { is_aigc: input.post_info.is_aigc })
                },
                source_info: input.source_info,
                ...(input.post_mode !== undefined && { post_mode: input.post_mode }),
                ...(input.media_type !== undefined && { media_type: input.media_type })
            },
            retries: 3
        };

        const response = await nango.post(config);

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.error.code !== 'ok') {
            throw new nango.ActionError({
                type: 'provider_error',
                message: providerResponse.error.message || providerResponse.error.code,
                code: providerResponse.error.code,
                log_id: providerResponse.error.log_id
            });
        }

        return {
            publish_id: providerResponse.data.publish_id,
            ...(providerResponse.data.upload_url !== undefined && { upload_url: providerResponse.data.upload_url }),
            ...(providerResponse.data.post_id !== undefined && { post_id: providerResponse.data.post_id })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
