import { createSync } from 'nango';
import { z } from 'zod';

const MetadataSchema = z.object({
    customer_ids: z.array(z.string()).min(1),
    login_customer_id: z.string(),
    developer_token: z.string().describe('Google Ads developer token. Example: "YOUR_DEVELOPER_TOKEN"')
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const CampaignSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    status: z.string().optional(),
    advertisingChannelType: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    containsEuPoliticalAdvertising: z.string().optional(),
    campaignBudgetResourceName: z.string().optional(),
    budgetAmountMicros: z.string().optional().nullable(),
    budgetStatus: z.string().optional()
});

const ProviderCampaignRowSchema = z.object({
    campaign: z.object({
        resourceName: z.string(),
        id: z.string(),
        name: z.string(),
        status: z.string(),
        advertisingChannelType: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        campaignBudget: z.string().optional(),
        containsEuPoliticalAdvertising: z.string().optional()
    }),
    campaignBudget: z
        .object({
            resourceName: z.string().optional(),
            amountMicros: z.string().optional().nullable(),
            status: z.string().optional()
        })
        .optional()
});

const ProviderChangeStatusRowSchema = z.object({
    changeStatus: z.object({
        resourceName: z.string(),
        lastChangeDateTime: z.string(),
        resourceStatus: z.string(),
        campaign: z.string().optional()
    })
});

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function extractSearchStreamRows(data: unknown): unknown[] {
    if (Array.isArray(data)) {
        return data.flatMap((chunk: unknown) => {
            if (!isObject(chunk)) {
                return [];
            }
            const results = chunk['results'];
            if (Array.isArray(results)) {
                return results;
            }
            return [];
        });
    }
    if (isObject(data)) {
        const results = data['results'];
        if (Array.isArray(results)) {
            return results;
        }
    }
    return [];
}

const sync = createSync({
    description: 'Sync campaigns for customer accounts in scope.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    models: {
        Campaign: CampaignSchema
    },

    exec: async (nango) => {
        const rawMetadata = await nango.getMetadata();
        const metadataResult = MetadataSchema.safeParse(rawMetadata);
        if (!metadataResult.success) {
            throw new Error(`Invalid metadata: ${metadataResult.error.message}`);
        }
        const metadata = metadataResult.data;
        if (!metadata.customer_ids.length) {
            throw new Error('customer_ids is required in metadata');
        }

        const checkpoint = await nango.getCheckpoint();
        const updatedAfter = checkpoint?.['updated_after'];
        const now = formatDate(new Date());

        async function searchStream(customerId: string, loginCustomerId: string, query: string): Promise<unknown[]> {
            // https://developers.google.com/google-ads/api/docs/reporting/streaming
            const response = await nango.post({
                endpoint: `/v21/customers/${encodeURIComponent(customerId)}/googleAds:searchStream`,
                headers: {
                    'developer-token': metadata.developer_token,
                    'login-customer-id': loginCustomerId
                },
                data: {
                    query
                },
                retries: 3
            });
            return extractSearchStreamRows(response.data);
        }

        function parseCampaignRows(rows: unknown[]): Array<z.infer<typeof CampaignSchema>> {
            const campaigns: Array<z.infer<typeof CampaignSchema>> = [];
            for (const row of rows) {
                const parsed = ProviderCampaignRowSchema.safeParse(row);
                if (!parsed.success) {
                    throw new Error(`Failed to parse campaign row: ${parsed.error.message}`);
                }
                const { campaign, campaignBudget } = parsed.data;
                campaigns.push({
                    id: campaign.resourceName,
                    name: campaign.name,
                    status: campaign.status,
                    advertisingChannelType: campaign.advertisingChannelType,
                    startDate: campaign.startDate,
                    endDate: campaign.endDate,
                    containsEuPoliticalAdvertising: campaign.containsEuPoliticalAdvertising,
                    campaignBudgetResourceName: campaignBudget?.resourceName,
                    budgetAmountMicros: campaignBudget?.amountMicros ?? null,
                    budgetStatus: campaignBudget?.status
                });
            }
            return campaigns;
        }

        for (const customerId of metadata.customer_ids) {
            if (!updatedAfter) {
                const query = `
SELECT
  campaign.resource_name,
  campaign.id,
  campaign.name,
  campaign.status,
  campaign.advertising_channel_type,
  campaign.start_date,
  campaign.end_date,
  campaign.campaign_budget,
  campaign.contains_eu_political_advertising,
  campaign_budget.resource_name,
  campaign_budget.amount_micros,
  campaign_budget.status
FROM campaign
WHERE campaign.status != 'REMOVED'
`;
                const rows = await searchStream(customerId, metadata.login_customer_id, query);
                const campaigns = parseCampaignRows(rows);
                if (campaigns.length > 0) {
                    await nango.batchSave(campaigns, 'Campaign');
                }
            } else {
                const changeQuery = `
SELECT
  change_status.resource_name,
  change_status.last_change_date_time,
  change_status.resource_status,
  change_status.campaign
FROM change_status
WHERE change_status.resource_type = 'CAMPAIGN'
  AND change_status.last_change_date_time >= '${updatedAfter}'
  AND change_status.last_change_date_time <= '${now}'
LIMIT 10000
`;
                const changeRows = await searchStream(customerId, metadata.login_customer_id, changeQuery);
                const removed: string[] = [];
                const changed: string[] = [];
                for (const row of changeRows) {
                    const parsed = ProviderChangeStatusRowSchema.safeParse(row);
                    if (!parsed.success) {
                        throw new Error(`Failed to parse change_status row: ${parsed.error.message}`);
                    }
                    const cs = parsed.data.changeStatus;
                    if (cs.campaign) {
                        if (cs.resourceStatus === 'REMOVED') {
                            removed.push(cs.campaign);
                        } else if (cs.resourceStatus === 'ADDED' || cs.resourceStatus === 'CHANGED') {
                            changed.push(cs.campaign);
                        }
                    }
                }

                if (removed.length > 0) {
                    await nango.batchDelete(
                        removed.map((id) => ({ id })),
                        'Campaign'
                    );
                }

                if (changed.length > 0) {
                    const resourceNames = changed.map((name) => `'${name}'`).join(',');
                    const refetchQuery = `
SELECT
  campaign.resource_name,
  campaign.id,
  campaign.name,
  campaign.status,
  campaign.advertising_channel_type,
  campaign.start_date,
  campaign.end_date,
  campaign.campaign_budget,
  campaign.contains_eu_political_advertising,
  campaign_budget.resource_name,
  campaign_budget.amount_micros,
  campaign_budget.status
FROM campaign
WHERE campaign.resource_name IN (${resourceNames})
  AND campaign.status != 'REMOVED'
`;
                    const rows = await searchStream(customerId, metadata.login_customer_id, refetchQuery);
                    const campaigns = parseCampaignRows(rows);
                    if (campaigns.length > 0) {
                        await nango.batchSave(campaigns, 'Campaign');
                    }
                }
            }
        }

        await nango.saveCheckpoint({ updated_after: now });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
