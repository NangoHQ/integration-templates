import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    publish_id: z.string().describe('The publish ID returned when initializing a post. Example: "v1234567890"')
});

const ProviderDataSchema = z.object({
    status: z.string(),
    fail_reason: z.string().optional(),
    publicaly_available_post_id: z.array(z.union([z.string(), z.number()])).optional(),
    uploaded_bytes: z.number().optional(),
    downloaded_bytes: z.number().optional()
});

const ProviderErrorSchema = z.object({
    code: z.string(),
    message: z.string().optional(),
    log_id: z.string().optional()
});

const ProviderResponseSchema = z.object({
    data: ProviderDataSchema,
    error: ProviderErrorSchema
});

const OutputSchema = z.object({
    status: z.string(),
    fail_reason: z.string().optional(),
    publicaly_available_post_id: z.array(z.string()).optional(),
    uploaded_bytes: z.number().optional(),
    downloaded_bytes: z.number().optional()
});

const action = createAction({
    description: 'Check TikTok publish status for an upload.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['video.upload', 'video.publish'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.tiktok.com/doc/content-posting-api-reference-get-video-status
            endpoint: '/v2/post/publish/status/fetch/',
            data: {
                publish_id: input.publish_id
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.error.code !== 'ok') {
            throw new nango.ActionError({
                type: 'provider_error',
                message: providerResponse.error.message || 'TikTok API returned an error',
                code: providerResponse.error.code,
                log_id: providerResponse.error.log_id
            });
        }

        const data = providerResponse.data;

        return {
            status: data.status,
            ...(data.fail_reason !== undefined && { fail_reason: data.fail_reason }),
            ...(data.publicaly_available_post_id !== undefined && {
                publicaly_available_post_id: data.publicaly_available_post_id.map((id) => String(id))
            }),
            ...(data.uploaded_bytes !== undefined && { uploaded_bytes: data.uploaded_bytes }),
            ...(data.downloaded_bytes !== undefined && { downloaded_bytes: data.downloaded_bytes })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
