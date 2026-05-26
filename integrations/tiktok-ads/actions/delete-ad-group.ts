import { createAction } from 'nango';
import { z } from 'zod';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    advertiser_id: z.string().describe('Advertiser ID. Example: "7644143197428744199"'),
    adgroup_id: z.string().describe('Ad group ID to delete. Example: "1234567890"')
});

const ProviderResponseSchema = z.object({
    code: z.number().optional(),
    message: z.string().optional(),
    request_id: z.string().optional(),
    data: z
        .object({
            adgroup_ids: z.array(z.string()).optional(),
            success_adgroup_ids: z.array(z.string()).optional(),
            failed_adgroup_ids: z.array(z.string()).optional(),
            errors: z.array(z.unknown()).optional()
        })
        .optional()
});

const OutputSchema = z.object({
    adgroup_id: z.string(),
    request_id: z.string().optional()
});

const action = createAction({
    description: 'Delete or archive a ad group in TikTok Ads.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-ad-group',
        group: 'Ad Groups'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://business-api.tiktok.com/portal/docs?id=1739591716326402
            endpoint: 'adgroup/status/update/',
            baseUrlOverride: 'https://sandbox-ads.tiktok.com/open_api/v1.3/',
            data: {
                advertiser_id: input.advertiser_id,
                adgroup_ids: [input.adgroup_id],
                operation_status: 'DELETE'
            },
            retries: 3
        };

        const response = await nango.post(config);

        const parsed = ProviderResponseSchema.parse(response.data);

        if (parsed.code !== undefined && parsed.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: parsed.message || `TikTok API returned code ${parsed.code}`,
                request_id: parsed.request_id,
                code: parsed.code
            });
        }

        const responseData = parsed.data;
        const deletedIds = responseData?.adgroup_ids ?? responseData?.success_adgroup_ids ?? [];

        if (!deletedIds.includes(input.adgroup_id)) {
            throw new nango.ActionError({
                type: 'delete_failed',
                message: 'Ad group deletion was not confirmed in the provider response.',
                adgroup_id: input.adgroup_id
            });
        }

        return {
            adgroup_id: input.adgroup_id,
            ...(parsed.request_id !== undefined && { request_id: parsed.request_id })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
