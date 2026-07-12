import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

function formatDate(date: Date): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

const CheckpointSchema = z.object({
    start_date: z.string(),
    end_date: z.string()
});

const AdAccountSchema = z.object({
    id: z.string()
});

const CampaignSchema = z.object({
    id: z.string()
});

const AnalyticsRowSchema = z
    .object({
        CAMPAIGN_ID: z.string(),
        DATE: z.string().optional()
    })
    .passthrough();

const CampaignAnalyticsSchema = z
    .object({
        id: z.string(),
        ad_account_id: z.string(),
        campaign_id: z.string(),
        date: z.string().optional()
    })
    .passthrough();

const ANALYTICS_COLUMNS = [
    'CAMPAIGN_ID',
    'CAMPAIGN_NAME',
    'SPEND_IN_MICRO_DOLLAR',
    'PAID_IMPRESSION',
    'CTR',
    'TOTAL_CLICKTHROUGH',
    'TOTAL_ENGAGEMENT',
    'CPM_IN_MICRO_DOLLAR',
    'TOTAL_IMPRESSION'
].join(',');

const sync = createSync({
    description: 'Sync campaign-level analytics as a rolling date-window snapshot',
    version: '1.0.0',
    frequency: 'every day',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        CampaignAnalytics: CampaignAnalyticsSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const prevEndDate = checkpoint != null && typeof checkpoint.end_date === 'string' ? checkpoint.end_date : undefined;

        const today = new Date();
        const endDate = formatDate(today);

        let startDate: string;
        if (prevEndDate) {
            const prevEnd = new Date(`${prevEndDate}T00:00:00Z`);
            const overlapStart = new Date(Date.UTC(prevEnd.getUTCFullYear(), prevEnd.getUTCMonth(), prevEnd.getUTCDate() - 3));
            const maxLookback = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - 90));
            startDate = overlapStart < maxLookback ? formatDate(maxLookback) : formatDate(overlapStart);
        } else {
            const defaultStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - 7));
            startDate = formatDate(defaultStart);
        }

        const adAccountProxyConfig: ProxyConfiguration = {
            // https://developers.pinterest.com/docs/api/v5/#tag/ad_accounts/operation/ad_accounts/list
            endpoint: '/v5/ad_accounts',
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'bookmark',
                cursor_path_in_response: 'bookmark',
                response_path: 'items',
                limit_name_in_request: 'page_size',
                limit: 25
            },
            retries: 3
        };

        const adAccountIds: string[] = [];
        for await (const page of nango.paginate(adAccountProxyConfig)) {
            for (const item of page) {
                const parsed = AdAccountSchema.safeParse(item);
                if (!parsed.success) {
                    throw new Error(`Invalid ad account response: ${parsed.error.message}`);
                }
                adAccountIds.push(parsed.data.id);
            }
        }

        const batchSize = 250;

        for (const adAccountId of adAccountIds) {
            const campaignProxyConfig: ProxyConfiguration = {
                // https://developers.pinterest.com/docs/api/v5/#tag/campaigns/operation/campaigns/list
                endpoint: `/v5/ad_accounts/${encodeURIComponent(adAccountId)}/campaigns`,
                paginate: {
                    type: 'cursor',
                    cursor_name_in_request: 'bookmark',
                    cursor_path_in_response: 'bookmark',
                    response_path: 'items',
                    limit_name_in_request: 'page_size',
                    limit: 25
                },
                retries: 3
            };

            const campaignIds: string[] = [];
            for await (const page of nango.paginate(campaignProxyConfig)) {
                for (const item of page) {
                    const parsed = CampaignSchema.safeParse(item);
                    if (!parsed.success) {
                        throw new Error(`Invalid campaign response: ${parsed.error.message}`);
                    }
                    campaignIds.push(parsed.data.id);
                }
            }

            if (campaignIds.length === 0) {
                continue;
            }

            for (let i = 0; i < campaignIds.length; i += batchSize) {
                const batch = campaignIds.slice(i, i + batchSize);

                // https://developers.pinterest.com/docs/api/v5/#tag/campaigns/operation/campaigns/analytics
                const response = await nango.get({
                    endpoint: `/v5/ad_accounts/${encodeURIComponent(adAccountId)}/campaigns/analytics`,
                    params: {
                        start_date: startDate,
                        end_date: endDate,
                        campaign_ids: batch.join(','),
                        columns: ANALYTICS_COLUMNS,
                        granularity: 'DAY'
                    },
                    retries: 3
                });

                const rows = z.array(AnalyticsRowSchema).safeParse(response.data);
                if (!rows.success) {
                    throw new Error(`Invalid analytics response: ${rows.error.message}`);
                }

                const records = rows.data.map((row) => ({
                    id: `${adAccountId}_${row.CAMPAIGN_ID}_${row.DATE ?? 'unknown'}`,
                    ad_account_id: adAccountId,
                    campaign_id: row.CAMPAIGN_ID,
                    date: row.DATE,
                    ...row
                }));

                if (records.length > 0) {
                    await nango.batchSave(records, 'CampaignAnalytics');
                }
            }
        }

        await nango.saveCheckpoint({
            start_date: startDate,
            end_date: endDate
        });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
