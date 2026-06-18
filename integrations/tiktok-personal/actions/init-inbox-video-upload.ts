import { z } from 'zod';
import { createAction } from 'nango';

const FileUploadSourceInfoSchema = z.object({
    source: z.literal('FILE_UPLOAD'),
    video_size: z.number().int(),
    chunk_size: z.number().int(),
    total_chunk_count: z.number().int()
});

const PullFromUrlSourceInfoSchema = z.object({
    source: z.literal('PULL_FROM_URL'),
    video_url: z.string()
});

const SourceInfoSchema = z.union([FileUploadSourceInfoSchema, PullFromUrlSourceInfoSchema]);

const InputSchema = z.object({
    source_info: SourceInfoSchema
});

const ProviderResponseDataSchema = z.object({
    publish_id: z.string(),
    upload_url: z.string().optional()
});

const ProviderResponseSchema = z.object({
    data: ProviderResponseDataSchema,
    error: z
        .object({
            code: z.string(),
            message: z.string(),
            log_id: z.string().optional()
        })
        .optional()
});

const OutputSchema = z.object({
    publish_id: z.string(),
    upload_url: z.string().optional()
});

const action = createAction({
    description: 'Initialize a TikTok video upload to a creator inbox as a draft.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['video.upload'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.tiktok.com/doc/content-posting-api-reference-upload-video
            endpoint: '/v2/post/publish/inbox/video/init/',
            data: {
                source_info: input.source_info
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.error && providerResponse.error.code !== 'ok') {
            throw new nango.ActionError({
                type: 'provider_error',
                message: providerResponse.error.message,
                code: providerResponse.error.code,
                log_id: providerResponse.error.log_id
            });
        }

        const data = providerResponse.data;

        return {
            publish_id: data.publish_id,
            ...(data.upload_url !== undefined && { upload_url: data.upload_url })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
