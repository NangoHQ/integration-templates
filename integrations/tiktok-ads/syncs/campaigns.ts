import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderCampaignSchema = z.object({
    campaign_id: z.union([z.string(), z.number()]),
    advertiser_id: z.union([z.string(), z.number()]),
    campaign_name: z.string().optional(),
    campaign_type: z.string().optional(),
    budget: z.number().optional(),
    budget_mode: z.string().optional(),
    objective: z.string().optional(),
    objective_type: z.string().optional(),
    operation_status: z.string().optional(),
    secondary_status: z.string().optional(),
    create_time: z.string().optional(),
    modify_time: z.string().optional()
});

const CampaignSchema = z.object({
    id: z.string(),
    campaign_id: z.string(),
    advertiser_id: z.string(),
    campaign_name: z.string().optional(),
    campaign_type: z.string().optional(),
    budget: z.number().optional(),
    budget_mode: z.string().optional(),
    objective: z.string().optional(),
    objective_type: z.string().optional(),
    operation_status: z.string().optional(),
    secondary_status: z.string().optional(),
    create_time: z.string().optional(),
    modify_time: z.string().optional()
});

const CheckpointSchema = z.object({
    modify_time: z.string()
});

const sync = createSync({
    description: 'Sync campaigns from TikTok Ads',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Campaign: CampaignSchema
    },
    endpoints: [
        {
            method: 'POST',
            path: '/syncs/campaigns'
        }
    ],

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const lastModifyTime = checkpoint?.modify_time;

        const proxyConfig: ProxyConfiguration = {
            // https://business-api.tiktok.com/portal/docs?id=1739315828649986
            endpoint: 'campaign/get/',
            method: 'GET',
            params: {
                advertiser_id: '7644143197428744199'
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'page_size',
                limit: 100,
                response_path: 'data.list'
            },
            retries: 3
        };

        let maxModifyTime: string | undefined = lastModifyTime;

        for await (const page of nango.paginate(proxyConfig)) {
            if (!Array.isArray(page)) {
                throw new Error('Expected page to be an array');
            }

            const campaigns: z.infer<typeof CampaignSchema>[] = [];

            for (const record of page) {
                const parsed = ProviderCampaignSchema.safeParse(record);
                if (!parsed.success) {
                    throw new Error(`Failed to parse campaign: ${parsed.error.message}`);
                }

                const providerCampaign = parsed.data;

                if (lastModifyTime && providerCampaign.modify_time && providerCampaign.modify_time <= lastModifyTime) {
                    continue;
                }

                campaigns.push({
                    id: String(providerCampaign.campaign_id),
                    campaign_id: String(providerCampaign.campaign_id),
                    advertiser_id: String(providerCampaign.advertiser_id),
                    campaign_name: providerCampaign.campaign_name,
                    campaign_type: providerCampaign.campaign_type,
                    budget: providerCampaign.budget,
                    budget_mode: providerCampaign.budget_mode,
                    objective: providerCampaign.objective,
                    objective_type: providerCampaign.objective_type,
                    operation_status: providerCampaign.operation_status,
                    secondary_status: providerCampaign.secondary_status,
                    create_time: providerCampaign.create_time,
                    modify_time: providerCampaign.modify_time
                });

                if (providerCampaign.modify_time) {
                    if (!maxModifyTime || providerCampaign.modify_time > maxModifyTime) {
                        maxModifyTime = providerCampaign.modify_time;
                    }
                }
            }

            if (campaigns.length > 0) {
                await nango.batchSave(campaigns, 'Campaign');
            }
        }

        if (maxModifyTime && maxModifyTime !== lastModifyTime) {
            await nango.saveCheckpoint({ modify_time: maxModifyTime });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
