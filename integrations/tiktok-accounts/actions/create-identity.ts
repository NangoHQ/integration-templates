import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    advertiser_id: z.string().describe('Advertiser ID. Example: "7644117588953235464"'),
    display_name: z.string().describe('Display name for the identity. Maximum length is 100 characters.'),
    image_uri: z.string().optional().describe('image_id of the avatar. Upload via the TikTok image upload endpoint. Width and height ratio must be 1:1.')
});

const ProviderResponseSchema = z.object({
    code: z.number(),
    message: z.string(),
    request_id: z.string(),
    data: z
        .object({
            identity_id: z.string()
        })
        .optional()
});

const OutputSchema = z.object({
    identity_id: z.string()
});

const action = createAction({
    description: 'Create a TikTok user identity (TT_USER) to authorize an account for use in Spark Ads.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-identity',
        group: 'Identity'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ad.info.manage'],

    exec: async (nango, input) => {
        // https://business-api.tiktok.com/portal/docs/api-reference/v1.3/identity/create/
        const response = await nango.post({
            endpoint: 'identity/create/',
            baseUrlOverride: 'https://sandbox-ads.tiktok.com/open_api/v1.3/',
            headers: {
                'Access-Token': 'ac274ff0f4a20e3e4f81aa7d95e593aafbdb6a27'
            },
            data: {
                advertiser_id: input.advertiser_id,
                display_name: input.display_name,
                ...(input.image_uri !== undefined && { image_uri: input.image_uri })
            },
            retries: 3
        });

        const responseData = response.data;

        const parsed = ProviderResponseSchema.safeParse(responseData);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Unexpected response from TikTok identity/create endpoint',
                details: parsed.error.message
            });
        }

        const providerData = parsed.data;
        if (providerData.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: providerData.message,
                code: providerData.code,
                request_id: providerData.request_id
            });
        }

        if (!providerData.data) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Missing data in provider response',
                request_id: providerData.request_id
            });
        }

        return {
            identity_id: providerData.data.identity_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
