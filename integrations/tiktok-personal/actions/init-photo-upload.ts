import { z } from 'zod';
import { createAction } from 'nango';

const PostInfoInputSchema = z.object({
    title: z.string().max(90).optional().describe('Post title. Max 90 UTF-16 runes.'),
    description: z.string().max(4000).optional().describe('Post description. Max 4000 UTF-16 runes.'),
    privacy_level: z
        .enum(['PUBLIC_TO_EVERYONE', 'MUTUAL_FOLLOW_FRIENDS', 'FOLLOWER_OF_CREATOR', 'SELF_ONLY'])
        .optional()
        .describe('Privacy level. Required for DIRECT_POST.'),
    disable_comment: z.boolean().optional().describe('If true, disables comments. Only for DIRECT_POST.'),
    auto_add_music: z.boolean().optional().describe('If true, auto-adds recommended music. Only for DIRECT_POST.'),
    brand_content_toggle: z.boolean().optional().describe('If true, content is a paid partnership. Only for DIRECT_POST.'),
    brand_organic_toggle: z.boolean().optional().describe('If true, content promotes own business. Only for DIRECT_POST.')
});

const SourceInfoInputSchema = z
    .object({
        source: z.literal('PULL_FROM_URL').describe('Must be PULL_FROM_URL for photos.'),
        photo_images: z.array(z.string().url()).min(1).max(35).describe('Publicly accessible photo URLs (1-35).'),
        photo_cover_index: z.number().int().min(0).describe('Index of the cover photo, starting from 0.')
    })
    .refine((data) => data.photo_cover_index < data.photo_images.length, {
        message: 'photo_cover_index must be less than the number of photo_images',
        path: ['photo_cover_index']
    });

const InputSchema = z.object({
    media_type: z.literal('PHOTO').describe('Must be PHOTO.'),
    post_mode: z.enum(['DIRECT_POST', 'MEDIA_UPLOAD']).describe('DIRECT_POST or MEDIA_UPLOAD.'),
    post_info: PostInfoInputSchema.describe('Post metadata.'),
    source_info: SourceInfoInputSchema.describe('Media source metadata.')
});

const ProviderResponseSchema = z.object({
    data: z
        .object({
            publish_id: z.string()
        })
        .optional(),
    error: z.object({
        code: z.string(),
        message: z.string().optional(),
        log_id: z.string().optional()
    })
});

const OutputSchema = z.object({
    publish_id: z.string().describe('Identifier to track the posting action.')
});

const action = createAction({
    description: 'Initialize a TikTok photo post.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/init-photo-upload',
        group: 'Content'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['video.publish'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.tiktok.com/doc/content-posting-api-reference-photo-post
            endpoint: '/v2/post/publish/content/init/',
            data: {
                media_type: input.media_type,
                post_mode: input.post_mode,
                post_info: {
                    ...(input.post_info.title !== undefined && { title: input.post_info.title }),
                    ...(input.post_info.description !== undefined && { description: input.post_info.description }),
                    ...(input.post_info.privacy_level !== undefined && { privacy_level: input.post_info.privacy_level }),
                    ...(input.post_info.disable_comment !== undefined && { disable_comment: input.post_info.disable_comment }),
                    ...(input.post_info.auto_add_music !== undefined && { auto_add_music: input.post_info.auto_add_music }),
                    ...(input.post_info.brand_content_toggle !== undefined && { brand_content_toggle: input.post_info.brand_content_toggle }),
                    ...(input.post_info.brand_organic_toggle !== undefined && { brand_organic_toggle: input.post_info.brand_organic_toggle })
                },
                source_info: {
                    source: input.source_info.source,
                    photo_images: input.source_info.photo_images,
                    photo_cover_index: input.source_info.photo_cover_index
                }
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.error.code !== 'ok') {
            throw new nango.ActionError({
                type: 'provider_error',
                message: providerResponse.error.message || `TikTok error: ${providerResponse.error.code}`,
                code: providerResponse.error.code,
                log_id: providerResponse.error.log_id
            });
        }

        if (!providerResponse.data?.publish_id) {
            throw new nango.ActionError({
                type: 'missing_publish_id',
                message: 'TikTok response did not contain a publish_id.'
            });
        }

        return {
            publish_id: providerResponse.data.publish_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
