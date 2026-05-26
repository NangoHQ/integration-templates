import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    advertiser_id: z.string().describe('Advertiser ID. Example: "7644143197428744199"'),
    campaign_id: z.string().describe('Campaign ID to delete. Example: "1234567890"')
});

const ProviderResponseSchema = z.object({
    code: z.number(),
    message: z.string(),
    request_id: z.string().optional(),
    data: z
        .object({
            modify_amount: z.number().optional(),
            success_amount: z.number().optional(),
            fail_amount: z.number().optional(),
            campaign_ids: z.array(z.string()).optional(),
            failures: z
                .array(
                    z.object({
                        campaign_id: z.string().optional(),
                        message: z.string().optional()
                    })
                )
                .optional()
        })
        .optional()
});

const OutputSchema = z.object({
    success: z.boolean(),
    campaign_id: z.string(),
    message: z.string().optional()
});

const action = createAction({
    description: 'Delete or archive a campaign in TikTok Ads.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-campaign',
        group: 'Campaigns'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ads_management'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://business-api.tiktok.com/portal/docs?id=1739320994354178
        const response = await nango.post({
            endpoint: 'campaign/status/update/',
            baseUrlOverride: 'https://sandbox-ads.tiktok.com/open_api/v1.3/',
            data: {
                advertiser_id: input.advertiser_id,
                campaign_ids: [input.campaign_id],
                operation_status: 'DELETE'
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        if (parsed.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: parsed.message || 'Failed to delete campaign',
                code: parsed.code
            });
        }

        const failures = parsed.data?.failures || [];
        const campaignFailure = failures.find((f) => f.campaign_id === input.campaign_id);

        if (campaignFailure) {
            throw new nango.ActionError({
                type: 'delete_failed',
                message: campaignFailure.message || 'Campaign deletion failed',
                campaign_id: input.campaign_id
            });
        }

        return {
            success: true,
            campaign_id: input.campaign_id,
            message: parsed.message
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
