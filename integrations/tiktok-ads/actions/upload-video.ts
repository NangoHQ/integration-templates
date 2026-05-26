import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const UploadTypeSchema = z.enum(['UPLOAD_BY_URL', 'UPLOAD_BY_VIDEO_ID']);

const InputSchema = z.object({
    advertiser_id: z.string().describe('TikTok Ads advertiser ID. Example: "7644143197428744199"'),
    upload_type: UploadTypeSchema.describe('Upload method. UPLOAD_BY_URL or UPLOAD_BY_VIDEO_ID'),
    video_url: z.string().optional().describe('Public URL of the video. Required when upload_type is UPLOAD_BY_URL'),
    video_id: z.string().optional().describe('Existing TikTok video ID. Required when upload_type is UPLOAD_BY_VIDEO_ID'),
    file_name: z.string().optional().describe('Video name. Length limit: 1 - 100 characters'),
    auto_bind_enabled: z.boolean().optional().describe('Whether to automatically bind the video to the advertiser'),
    auto_fix_enabled: z.boolean().optional().describe('Whether to automatically fix detected issues'),
    flaw_detect: z.boolean().optional().describe('Whether to run flaw detection'),
    is_third_party: z.boolean().optional().describe('Whether the video is from a third party')
});

const OutputSchema = z.object({
    video_id: z.string().describe('Uploaded video ID'),
    material_id: z.string().optional().describe('Material ID of the uploaded video'),
    request_id: z.string().optional().describe('API request ID for tracing')
});

const TikTokApiResponseSchema = z.object({
    code: z.number().optional(),
    message: z.string().optional(),
    request_id: z.string().optional(),
    data: z.unknown().optional()
});

const action = createAction({
    description: 'Upload a video creative to TikTok Ads',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/upload-video',
        group: 'Creatives'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ads_management'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.upload_type === 'UPLOAD_BY_URL' && (!input.video_url || input.video_url.length === 0)) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'video_url is required when upload_type is UPLOAD_BY_URL'
            });
        }

        if (input.upload_type === 'UPLOAD_BY_VIDEO_ID' && (!input.video_id || input.video_id.length === 0)) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'video_id is required when upload_type is UPLOAD_BY_VIDEO_ID'
            });
        }

        const requestBody: Record<string, string | boolean | undefined> = {
            advertiser_id: input.advertiser_id,
            upload_type: input.upload_type
        };

        if (input.upload_type === 'UPLOAD_BY_URL') {
            requestBody['video_url'] = input.video_url;
        } else if (input.upload_type === 'UPLOAD_BY_VIDEO_ID') {
            requestBody['video_id'] = input.video_id;
        }

        if (input.file_name !== undefined) {
            requestBody['file_name'] = input.file_name;
        }
        if (input.auto_bind_enabled !== undefined) {
            requestBody['auto_bind_enabled'] = input.auto_bind_enabled;
        }
        if (input.auto_fix_enabled !== undefined) {
            requestBody['auto_fix_enabled'] = input.auto_fix_enabled;
        }
        if (input.flaw_detect !== undefined) {
            requestBody['flaw_detect'] = input.flaw_detect;
        }
        if (input.is_third_party !== undefined) {
            requestBody['is_third_party'] = input.is_third_party;
        }

        const config: ProxyConfiguration = {
            // https://business-api.tiktok.com/portal/docs/api-reference/v1.3
            endpoint: 'file/video/ad/upload/',
            data: requestBody,
            retries: 1,
            baseUrlOverride: 'https://sandbox-ads.tiktok.com/open_api/v1.3/'
        };

        const response = await nango.post(config);

        const apiResponse = TikTokApiResponseSchema.parse(response.data);

        if (apiResponse.code !== undefined && apiResponse.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: apiResponse.message || `TikTok API error: ${apiResponse.code}`,
                code: apiResponse.code,
                request_id: apiResponse.request_id
            });
        }

        const responseData: Record<string, unknown> = {};
        if (Array.isArray(apiResponse.data) && apiResponse.data.length > 0 && typeof apiResponse.data[0] === 'object' && apiResponse.data[0] !== null) {
            for (const [key, val] of Object.entries(apiResponse.data[0])) {
                responseData[key] = val;
            }
        } else if (typeof apiResponse.data === 'object' && apiResponse.data !== null && !Array.isArray(apiResponse.data)) {
            for (const [key, val] of Object.entries(apiResponse.data)) {
                responseData[key] = val;
            }
        }

        const videoId = typeof responseData['video_id'] === 'string' ? responseData['video_id'] : '';
        const materialId = typeof responseData['material_id'] === 'string' ? responseData['material_id'] : undefined;
        const requestId = typeof apiResponse.request_id === 'string' ? apiResponse.request_id : undefined;

        if (!videoId) {
            throw new nango.ActionError({
                type: 'missing_video_id',
                message: 'Upload succeeded but video_id was missing from the provider response'
            });
        }

        return {
            video_id: videoId,
            ...(materialId !== undefined && { material_id: materialId }),
            ...(requestId !== undefined && { request_id: requestId })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
