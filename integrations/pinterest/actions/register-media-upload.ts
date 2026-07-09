import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    media_type: z
        .enum(['video', 'image_latent_disclosure', 'video_latent_disclosure'])
        .describe("Media type to register. Must be 'video', 'image_latent_disclosure', or 'video_latent_disclosure'.")
});

const UploadParametersSchema = z
    .object({
        'x-amz-date': z.string().optional(),
        'x-amz-signature': z.string().optional(),
        'x-amz-security-token': z.string().optional(),
        'x-amz-algorithm': z.string().optional(),
        'x-amz-credential': z.string().optional(),
        key: z.string().optional(),
        policy: z.string().optional(),
        bucket: z.string().optional(),
        'Content-Type': z.string().optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    media_id: z.string(),
    media_type: z.enum(['video', 'image_latent_disclosure', 'video_latent_disclosure']).optional(),
    upload_url: z.string().optional(),
    upload_parameters: UploadParametersSchema.optional()
});

const OutputSchema = z.object({
    media_id: z.string(),
    media_type: z.enum(['video', 'image_latent_disclosure', 'video_latent_disclosure']).optional(),
    upload_url: z.string().optional(),
    upload_parameters: UploadParametersSchema.optional()
});

const action = createAction({
    description: 'Register a media upload and get a signed upload URL.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['pins:read', 'pins:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.pinterest.com/docs/api/v5/#tag/media/operation/media/create
        const response = await nango.post({
            endpoint: '/v5/media',
            data: {
                media_type: input.media_type
            },
            retries: 3
        });

        const providerData = ProviderResponseSchema.parse(response.data);

        return {
            media_id: providerData.media_id,
            ...(providerData.media_type !== undefined && { media_type: providerData.media_type }),
            ...(providerData.upload_url !== undefined && { upload_url: providerData.upload_url }),
            ...(providerData.upload_parameters !== undefined && { upload_parameters: providerData.upload_parameters })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
