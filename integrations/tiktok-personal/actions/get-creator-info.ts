import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const ProviderErrorSchema = z.object({
    code: z.string(),
    message: z.string(),
    log_id: z.string()
});

const ProviderDataSchema = z.object({
    creator_avatar_url: z.string().optional(),
    creator_username: z.string().optional(),
    creator_nickname: z.string().optional(),
    privacy_level_options: z.array(z.string()).optional(),
    comment_disabled: z.boolean().optional(),
    duet_disabled: z.boolean().optional(),
    stitch_disabled: z.boolean().optional(),
    max_video_post_duration_sec: z.number().optional()
});

const ProviderResponseSchema = z.object({
    data: ProviderDataSchema.optional(),
    error: ProviderErrorSchema
});

const OutputSchema = z.object({
    creator_avatar_url: z.string().optional(),
    creator_username: z.string().optional(),
    creator_nickname: z.string().optional(),
    privacy_level_options: z.array(z.string()).optional(),
    comment_disabled: z.boolean().optional(),
    duet_disabled: z.boolean().optional(),
    stitch_disabled: z.boolean().optional(),
    max_video_post_duration_sec: z.number().optional()
});

const action = createAction({
    description: 'Fetch creator posting capabilities and limits.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['video.publish'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.tiktok.com/doc/content-posting-api-reference-query-creator-info
            endpoint: '/v2/post/publish/creator_info/query/',
            data: {},
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.error.code !== 'ok') {
            throw new nango.ActionError({
                type: 'provider_error',
                message: providerResponse.error.message,
                code: providerResponse.error.code,
                log_id: providerResponse.error.log_id
            });
        }

        const data = providerResponse.data || {};

        return {
            ...(data.creator_avatar_url !== undefined && { creator_avatar_url: data.creator_avatar_url }),
            ...(data.creator_username !== undefined && { creator_username: data.creator_username }),
            ...(data.creator_nickname !== undefined && { creator_nickname: data.creator_nickname }),
            ...(data.privacy_level_options !== undefined && { privacy_level_options: data.privacy_level_options }),
            ...(data.comment_disabled !== undefined && { comment_disabled: data.comment_disabled }),
            ...(data.duet_disabled !== undefined && { duet_disabled: data.duet_disabled }),
            ...(data.stitch_disabled !== undefined && { stitch_disabled: data.stitch_disabled }),
            ...(data.max_video_post_duration_sec !== undefined && { max_video_post_duration_sec: data.max_video_post_duration_sec })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
