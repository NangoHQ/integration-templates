import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        advertiser_id: z.string().describe('Advertiser ID. Example: "7644143197428744199"'),
        upload_type: z.enum(['UPLOAD_BY_URL', 'UPLOAD_BY_FILE_ID']).describe('Image upload method'),
        image_url: z.string().url().optional().describe('Image URL. Required when upload_type is UPLOAD_BY_URL'),
        file_id: z.string().optional().describe('File ID. Required when upload_type is UPLOAD_BY_FILE_ID'),
        file_name: z.string().optional().describe('Image name. Length limit: 1-100 characters')
    })
    .refine(
        (data) => {
            if (data.upload_type === 'UPLOAD_BY_URL') {
                return data.image_url !== undefined && data.image_url.length > 0;
            }
            if (data.upload_type === 'UPLOAD_BY_FILE_ID') {
                return data.file_id !== undefined && data.file_id.length > 0;
            }
            return false;
        },
        {
            message: 'image_url is required when upload_type is UPLOAD_BY_URL; file_id is required when upload_type is UPLOAD_BY_FILE_ID'
        }
    );

const TikTokResponseSchema = z.object({
    code: z.number(),
    message: z.string(),
    request_id: z.string().optional(),
    data: z.unknown().optional()
});

const ProviderResponseSchema = z.object({
    image_id: z.string(),
    width: z.number().optional(),
    height: z.number().optional(),
    file_size: z.number().optional(),
    type: z.string().optional(),
    signature: z.string().optional(),
    preview_url: z.string().optional()
});

const OutputSchema = z.object({
    image_id: z.string(),
    width: z.number().optional(),
    height: z.number().optional(),
    file_size: z.number().optional(),
    type: z.string().optional(),
    signature: z.string().optional(),
    preview_url: z.string().optional()
});

const action = createAction({
    description: 'Create a creative asset in TikTok Ads',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ad_management'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody: Record<string, string> = {
            advertiser_id: input.advertiser_id,
            upload_type: input.upload_type
        };

        if (input.file_name !== undefined) {
            requestBody['file_name'] = input.file_name;
        }

        if (input.upload_type === 'UPLOAD_BY_URL' && input.image_url !== undefined) {
            requestBody['image_url'] = input.image_url;
        } else if (input.upload_type === 'UPLOAD_BY_FILE_ID' && input.file_id !== undefined) {
            requestBody['file_id'] = input.file_id;
        }

        const response = await nango.post({
            // https://business-api.tiktok.com/portal/docs?id=1739067433456642
            endpoint: '/file/image/ad/upload/',
            data: requestBody,
            retries: 3
        });

        const tiktokResponse = TikTokResponseSchema.safeParse(response.data);
        if (!tiktokResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from TikTok API'
            });
        }

        if (tiktokResponse.data.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: tiktokResponse.data.message,
                code: tiktokResponse.data.code,
                request_id: tiktokResponse.data.request_id
            });
        }

        const providerData = ProviderResponseSchema.safeParse(tiktokResponse.data.data);
        if (!providerData.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from TikTok API',
                details: providerData.error.message
            });
        }

        const data = providerData.data;

        return {
            image_id: data.image_id,
            ...(data.width !== undefined && { width: data.width }),
            ...(data.height !== undefined && { height: data.height }),
            ...(data.file_size !== undefined && { file_size: data.file_size }),
            ...(data.type !== undefined && { type: data.type }),
            ...(data.signature !== undefined && { signature: data.signature }),
            ...(data.preview_url !== undefined && { preview_url: data.preview_url })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
