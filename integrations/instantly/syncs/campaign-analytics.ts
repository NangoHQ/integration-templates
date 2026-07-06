import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const CheckpointSchema = z.object({
    start_date: z.string(),
    end_date: z.string()
});

const CampaignAnalyticsSchema = z.object({
    id: z.string(),
    campaign_id: z.string(),
    campaign_name: z.string().optional(),
    campaign_status: z.number().optional(),
    campaign_is_evergreen: z.boolean().optional(),
    leads_count: z.number().optional(),
    contacted_count: z.number().optional(),
    emails_sent_count: z.number().optional(),
    new_leads_contacted_count: z.number().optional(),
    open_count: z.number().optional(),
    open_count_unique: z.number().optional(),
    open_count_unique_by_step: z.number().optional(),
    reply_count: z.number().optional(),
    reply_count_unique: z.number().optional(),
    reply_count_unique_by_step: z.number().optional(),
    reply_count_automatic: z.number().optional(),
    reply_count_automatic_unique: z.number().optional(),
    reply_count_automatic_unique_by_step: z.number().optional(),
    link_click_count: z.number().optional(),
    link_click_count_unique: z.number().optional(),
    link_click_count_unique_by_step: z.number().optional(),
    bounced_count: z.number().optional(),
    unsubscribed_count: z.number().optional(),
    completed_count: z.number().optional(),
    total_opportunities: z.number().optional(),
    total_opportunity_value: z.number().optional(),
    start_date: z.string().optional(),
    end_date: z.string().optional()
});

const CampaignAnalyticsOverviewSchema = z.object({
    id: z.string(),
    campaign_id: z.string(),
    open_count: z.number().optional(),
    open_count_unique: z.number().optional(),
    open_count_unique_by_step: z.number().optional(),
    link_click_count: z.number().optional(),
    link_click_count_unique: z.number().optional(),
    link_click_count_unique_by_step: z.number().optional(),
    reply_count: z.number().optional(),
    reply_count_unique: z.number().optional(),
    reply_count_unique_by_step: z.number().optional(),
    reply_count_automatic: z.number().optional(),
    reply_count_automatic_unique: z.number().optional(),
    reply_count_automatic_unique_by_step: z.number().optional(),
    bounced_count: z.number().optional(),
    unsubscribed_count: z.number().optional(),
    completed_count: z.number().optional(),
    emails_sent_count: z.number().optional(),
    contacted_count: z.number().optional(),
    new_leads_contacted_count: z.number().optional(),
    total_opportunities: z.number().optional(),
    total_opportunity_value: z.number().optional(),
    total_interested: z.number().optional(),
    total_meeting_booked: z.number().optional(),
    total_meeting_completed: z.number().optional(),
    total_closed: z.number().optional(),
    start_date: z.string().optional(),
    end_date: z.string().optional()
});

const CampaignAnalyticsDailySchema = z.object({
    id: z.string(),
    campaign_id: z.string(),
    date: z.string(),
    sent: z.number().optional(),
    contacted: z.number().optional(),
    new_leads_contacted: z.number().optional(),
    opened: z.number().optional(),
    unique_opened: z.number().optional(),
    replies: z.number().optional(),
    unique_replies: z.number().optional(),
    replies_automatic: z.number().optional(),
    unique_replies_automatic: z.number().optional(),
    clicks: z.number().optional(),
    unique_clicks: z.number().optional(),
    opportunities: z.number().optional(),
    unique_opportunities: z.number().optional()
});

const CampaignAnalyticsStepsSchema = z.object({
    id: z.string(),
    campaign_id: z.string(),
    step: z.string().nullable().optional(),
    variant: z.string().nullable().optional(),
    sent: z.number().optional(),
    opened: z.number().optional(),
    unique_opened: z.number().optional(),
    replies: z.number().optional(),
    unique_replies: z.number().optional(),
    replies_automatic: z.number().optional(),
    unique_replies_automatic: z.number().optional(),
    clicks: z.number().optional(),
    unique_clicks: z.number().optional(),
    opportunities: z.number().optional(),
    unique_opportunities: z.number().optional(),
    start_date: z.string().optional(),
    end_date: z.string().optional()
});

function formatDate(date: Date): string {
    const iso = date.toISOString();
    const idx = iso.indexOf('T');
    return idx >= 0 ? iso.slice(0, idx) : iso;
}

function getDefaultStartDate(): string {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return formatDate(d);
}

const CampaignListItemSchema = z.object({
    id: z.string()
});

const AnalyticsItemSchema = z.object({
    campaign_id: z.string(),
    campaign_name: z.string().optional(),
    campaign_status: z.number().optional(),
    campaign_is_evergreen: z.boolean().optional(),
    leads_count: z.number().optional(),
    contacted_count: z.number().optional(),
    emails_sent_count: z.number().optional(),
    new_leads_contacted_count: z.number().optional(),
    open_count: z.number().optional(),
    open_count_unique: z.number().optional(),
    open_count_unique_by_step: z.number().optional(),
    reply_count: z.number().optional(),
    reply_count_unique: z.number().optional(),
    reply_count_unique_by_step: z.number().optional(),
    reply_count_automatic: z.number().optional(),
    reply_count_automatic_unique: z.number().optional(),
    reply_count_automatic_unique_by_step: z.number().optional(),
    link_click_count: z.number().optional(),
    link_click_count_unique: z.number().optional(),
    link_click_count_unique_by_step: z.number().optional(),
    bounced_count: z.number().optional(),
    unsubscribed_count: z.number().optional(),
    completed_count: z.number().optional(),
    total_opportunities: z.number().optional(),
    total_opportunity_value: z.number().optional()
});

const OverviewSchema = z.object({
    open_count: z.number().optional(),
    open_count_unique: z.number().optional(),
    open_count_unique_by_step: z.number().optional(),
    link_click_count: z.number().optional(),
    link_click_count_unique: z.number().optional(),
    link_click_count_unique_by_step: z.number().optional(),
    reply_count: z.number().optional(),
    reply_count_unique: z.number().optional(),
    reply_count_unique_by_step: z.number().optional(),
    reply_count_automatic: z.number().optional(),
    reply_count_automatic_unique: z.number().optional(),
    reply_count_automatic_unique_by_step: z.number().optional(),
    bounced_count: z.number().optional(),
    unsubscribed_count: z.number().optional(),
    completed_count: z.number().optional(),
    emails_sent_count: z.number().optional(),
    contacted_count: z.number().optional(),
    new_leads_contacted_count: z.number().optional(),
    total_opportunities: z.number().optional(),
    total_opportunity_value: z.number().optional(),
    total_interested: z.number().optional(),
    total_meeting_booked: z.number().optional(),
    total_meeting_completed: z.number().optional(),
    total_closed: z.number().optional()
});

const DailyItemSchema = z.object({
    date: z.string(),
    sent: z.number().optional(),
    contacted: z.number().optional(),
    new_leads_contacted: z.number().optional(),
    opened: z.number().optional(),
    unique_opened: z.number().optional(),
    replies: z.number().optional(),
    unique_replies: z.number().optional(),
    replies_automatic: z.number().optional(),
    unique_replies_automatic: z.number().optional(),
    clicks: z.number().optional(),
    unique_clicks: z.number().optional(),
    opportunities: z.number().optional(),
    unique_opportunities: z.number().optional()
});

const StepsItemSchema = z.object({
    step: z.string().nullable().optional(),
    variant: z.string().nullable().optional(),
    sent: z.number().optional(),
    opened: z.number().optional(),
    unique_opened: z.number().optional(),
    replies: z.number().optional(),
    unique_replies: z.number().optional(),
    replies_automatic: z.number().optional(),
    unique_replies_automatic: z.number().optional(),
    clicks: z.number().optional(),
    unique_clicks: z.number().optional(),
    opportunities: z.number().optional(),
    unique_opportunities: z.number().optional()
});

const sync = createSync({
    description: 'Sync campaign analytics.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        CampaignAnalytics: CampaignAnalyticsSchema,
        CampaignAnalyticsOverview: CampaignAnalyticsOverviewSchema,
        CampaignAnalyticsDaily: CampaignAnalyticsDailySchema,
        CampaignAnalyticsSteps: CampaignAnalyticsStepsSchema
    },
    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const today = formatDate(new Date());
        const startDate = checkpoint && 'end_date' in checkpoint ? checkpoint.end_date : getDefaultStartDate();
        const endDate = today;

        const campaignIds: string[] = [];

        const campaignsProxyConfig: ProxyConfiguration = {
            // https://developer.instantly.ai/api-reference/campaign/list-campaign
            endpoint: '/v2/campaigns',
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'starting_after',
                cursor_path_in_response: 'next_starting_after',
                response_path: 'items',
                limit_name_in_request: 'limit',
                limit: 100
            },
            retries: 3
        };

        for await (const page of nango.paginate(campaignsProxyConfig)) {
            const pageParse = z.array(CampaignListItemSchema).safeParse(page);
            if (!pageParse.success) {
                throw new Error(`Failed to parse campaigns page: ${pageParse.error.message}`);
            }
            for (const campaign of pageParse.data) {
                campaignIds.push(campaign.id);
            }
        }

        const allAnalyticsResponse = await nango.get({
            // https://developer.instantly.ai/api-reference/campaign/get-campaigns-analytics
            endpoint: '/v2/campaigns/analytics',
            params: {
                start_date: startDate,
                end_date: endDate
            },
            retries: 3
        });

        const analyticsMap = new Map<string, z.infer<typeof AnalyticsItemSchema>>();
        const allAnalyticsParse = z.array(AnalyticsItemSchema).safeParse(allAnalyticsResponse.data);
        if (allAnalyticsParse.success) {
            for (const item of allAnalyticsParse.data) {
                analyticsMap.set(item.campaign_id, item);
            }
        }

        for (const campaignId of campaignIds) {
            const analyticsItem = analyticsMap.get(campaignId);
            if (analyticsItem) {
                const record = {
                    id: `${campaignId}_${startDate}_${endDate}`,
                    campaign_id: analyticsItem.campaign_id,
                    ...(analyticsItem.campaign_name !== undefined && { campaign_name: analyticsItem.campaign_name }),
                    ...(analyticsItem.campaign_status !== undefined && { campaign_status: analyticsItem.campaign_status }),
                    ...(analyticsItem.campaign_is_evergreen !== undefined && { campaign_is_evergreen: analyticsItem.campaign_is_evergreen }),
                    ...(analyticsItem.leads_count !== undefined && { leads_count: analyticsItem.leads_count }),
                    ...(analyticsItem.contacted_count !== undefined && { contacted_count: analyticsItem.contacted_count }),
                    ...(analyticsItem.emails_sent_count !== undefined && { emails_sent_count: analyticsItem.emails_sent_count }),
                    ...(analyticsItem.new_leads_contacted_count !== undefined && { new_leads_contacted_count: analyticsItem.new_leads_contacted_count }),
                    ...(analyticsItem.open_count !== undefined && { open_count: analyticsItem.open_count }),
                    ...(analyticsItem.open_count_unique !== undefined && { open_count_unique: analyticsItem.open_count_unique }),
                    ...(analyticsItem.open_count_unique_by_step !== undefined && { open_count_unique_by_step: analyticsItem.open_count_unique_by_step }),
                    ...(analyticsItem.reply_count !== undefined && { reply_count: analyticsItem.reply_count }),
                    ...(analyticsItem.reply_count_unique !== undefined && { reply_count_unique: analyticsItem.reply_count_unique }),
                    ...(analyticsItem.reply_count_unique_by_step !== undefined && { reply_count_unique_by_step: analyticsItem.reply_count_unique_by_step }),
                    ...(analyticsItem.reply_count_automatic !== undefined && { reply_count_automatic: analyticsItem.reply_count_automatic }),
                    ...(analyticsItem.reply_count_automatic_unique !== undefined && {
                        reply_count_automatic_unique: analyticsItem.reply_count_automatic_unique
                    }),
                    ...(analyticsItem.reply_count_automatic_unique_by_step !== undefined && {
                        reply_count_automatic_unique_by_step: analyticsItem.reply_count_automatic_unique_by_step
                    }),
                    ...(analyticsItem.link_click_count !== undefined && { link_click_count: analyticsItem.link_click_count }),
                    ...(analyticsItem.link_click_count_unique !== undefined && { link_click_count_unique: analyticsItem.link_click_count_unique }),
                    ...(analyticsItem.link_click_count_unique_by_step !== undefined && {
                        link_click_count_unique_by_step: analyticsItem.link_click_count_unique_by_step
                    }),
                    ...(analyticsItem.bounced_count !== undefined && { bounced_count: analyticsItem.bounced_count }),
                    ...(analyticsItem.unsubscribed_count !== undefined && { unsubscribed_count: analyticsItem.unsubscribed_count }),
                    ...(analyticsItem.completed_count !== undefined && { completed_count: analyticsItem.completed_count }),
                    ...(analyticsItem.total_opportunities !== undefined && { total_opportunities: analyticsItem.total_opportunities }),
                    ...(analyticsItem.total_opportunity_value !== undefined && { total_opportunity_value: analyticsItem.total_opportunity_value }),
                    start_date: startDate,
                    end_date: endDate
                };
                await nango.batchSave([record], 'CampaignAnalytics');
            }

            const overviewResponse = await nango.get({
                // https://developer.instantly.ai/api-reference/campaign/get-campaigns-analytics-overview
                endpoint: '/v2/campaigns/analytics/overview',
                params: {
                    id: campaignId,
                    start_date: startDate,
                    end_date: endDate
                },
                retries: 3
            });

            const overviewParse = OverviewSchema.safeParse(overviewResponse.data);
            if (!overviewParse.success) {
                throw new Error(`Failed to parse campaign overview for ${campaignId}: ${overviewParse.error.message}`);
            }
            const overviewData = overviewParse.data;
            const overviewRecord = {
                id: `${campaignId}_${startDate}_${endDate}`,
                campaign_id: campaignId,
                ...(overviewData.open_count !== undefined && { open_count: overviewData.open_count }),
                ...(overviewData.open_count_unique !== undefined && { open_count_unique: overviewData.open_count_unique }),
                ...(overviewData.open_count_unique_by_step !== undefined && { open_count_unique_by_step: overviewData.open_count_unique_by_step }),
                ...(overviewData.link_click_count !== undefined && { link_click_count: overviewData.link_click_count }),
                ...(overviewData.link_click_count_unique !== undefined && { link_click_count_unique: overviewData.link_click_count_unique }),
                ...(overviewData.link_click_count_unique_by_step !== undefined && {
                    link_click_count_unique_by_step: overviewData.link_click_count_unique_by_step
                }),
                ...(overviewData.reply_count !== undefined && { reply_count: overviewData.reply_count }),
                ...(overviewData.reply_count_unique !== undefined && { reply_count_unique: overviewData.reply_count_unique }),
                ...(overviewData.reply_count_unique_by_step !== undefined && { reply_count_unique_by_step: overviewData.reply_count_unique_by_step }),
                ...(overviewData.reply_count_automatic !== undefined && { reply_count_automatic: overviewData.reply_count_automatic }),
                ...(overviewData.reply_count_automatic_unique !== undefined && { reply_count_automatic_unique: overviewData.reply_count_automatic_unique }),
                ...(overviewData.reply_count_automatic_unique_by_step !== undefined && {
                    reply_count_automatic_unique_by_step: overviewData.reply_count_automatic_unique_by_step
                }),
                ...(overviewData.bounced_count !== undefined && { bounced_count: overviewData.bounced_count }),
                ...(overviewData.unsubscribed_count !== undefined && { unsubscribed_count: overviewData.unsubscribed_count }),
                ...(overviewData.completed_count !== undefined && { completed_count: overviewData.completed_count }),
                ...(overviewData.emails_sent_count !== undefined && { emails_sent_count: overviewData.emails_sent_count }),
                ...(overviewData.contacted_count !== undefined && { contacted_count: overviewData.contacted_count }),
                ...(overviewData.new_leads_contacted_count !== undefined && { new_leads_contacted_count: overviewData.new_leads_contacted_count }),
                ...(overviewData.total_opportunities !== undefined && { total_opportunities: overviewData.total_opportunities }),
                ...(overviewData.total_opportunity_value !== undefined && { total_opportunity_value: overviewData.total_opportunity_value }),
                ...(overviewData.total_interested !== undefined && { total_interested: overviewData.total_interested }),
                ...(overviewData.total_meeting_booked !== undefined && { total_meeting_booked: overviewData.total_meeting_booked }),
                ...(overviewData.total_meeting_completed !== undefined && { total_meeting_completed: overviewData.total_meeting_completed }),
                ...(overviewData.total_closed !== undefined && { total_closed: overviewData.total_closed }),
                start_date: startDate,
                end_date: endDate
            };
            await nango.batchSave([overviewRecord], 'CampaignAnalyticsOverview');

            const dailyResponse = await nango.get({
                // https://developer.instantly.ai/api-reference/campaign/get-daily-campaign-analytics
                endpoint: '/v2/campaigns/analytics/daily',
                params: {
                    campaign_id: campaignId,
                    start_date: startDate,
                    end_date: endDate
                },
                retries: 3
            });

            const dailyParse = z.array(DailyItemSchema).safeParse(dailyResponse.data);
            if (!dailyParse.success) {
                throw new Error(`Failed to parse daily analytics for campaign ${campaignId}: ${dailyParse.error.message}`);
            }
            {
                const records = dailyParse.data.map((item) => {
                    const date = item.date;
                    return {
                        id: `${campaignId}_${date}`,
                        campaign_id: campaignId,
                        date,
                        ...(item.sent !== undefined && { sent: item.sent }),
                        ...(item.contacted !== undefined && { contacted: item.contacted }),
                        ...(item.new_leads_contacted !== undefined && { new_leads_contacted: item.new_leads_contacted }),
                        ...(item.opened !== undefined && { opened: item.opened }),
                        ...(item.unique_opened !== undefined && { unique_opened: item.unique_opened }),
                        ...(item.replies !== undefined && { replies: item.replies }),
                        ...(item.unique_replies !== undefined && { unique_replies: item.unique_replies }),
                        ...(item.replies_automatic !== undefined && { replies_automatic: item.replies_automatic }),
                        ...(item.unique_replies_automatic !== undefined && { unique_replies_automatic: item.unique_replies_automatic }),
                        ...(item.clicks !== undefined && { clicks: item.clicks }),
                        ...(item.unique_clicks !== undefined && { unique_clicks: item.unique_clicks }),
                        ...(item.opportunities !== undefined && { opportunities: item.opportunities }),
                        ...(item.unique_opportunities !== undefined && { unique_opportunities: item.unique_opportunities })
                    };
                });
                if (records.length > 0) {
                    await nango.batchSave(records, 'CampaignAnalyticsDaily');
                }
            }

            const stepsResponse = await nango.get({
                // https://developer.instantly.ai/api-reference/campaign/get-campaign-steps-analytics
                endpoint: '/v2/campaigns/analytics/steps',
                params: {
                    campaign_id: campaignId,
                    start_date: startDate,
                    end_date: endDate,
                    include_opportunities_count: 'true'
                },
                retries: 3
            });

            const stepsParse = z.array(StepsItemSchema).safeParse(stepsResponse.data);
            if (!stepsParse.success) {
                throw new Error(`Failed to parse step analytics for campaign ${campaignId}: ${stepsParse.error.message}`);
            }
            {
                const records = stepsParse.data.map((item) => {
                    const stepValue = item.step === null || item.step === undefined ? 'null' : item.step;
                    const variantValue = item.variant === null || item.variant === undefined ? 'null' : item.variant;
                    return {
                        id: `${campaignId}_step_${stepValue}_var_${variantValue}_${startDate}_${endDate}`,
                        campaign_id: campaignId,
                        ...(item.step !== undefined && item.step !== null && { step: item.step }),
                        ...(item.variant !== undefined && item.variant !== null && { variant: item.variant }),
                        ...(item.sent !== undefined && { sent: item.sent }),
                        ...(item.opened !== undefined && { opened: item.opened }),
                        ...(item.unique_opened !== undefined && { unique_opened: item.unique_opened }),
                        ...(item.replies !== undefined && { replies: item.replies }),
                        ...(item.unique_replies !== undefined && { unique_replies: item.unique_replies }),
                        ...(item.replies_automatic !== undefined && { replies_automatic: item.replies_automatic }),
                        ...(item.unique_replies_automatic !== undefined && { unique_replies_automatic: item.unique_replies_automatic }),
                        ...(item.clicks !== undefined && { clicks: item.clicks }),
                        ...(item.unique_clicks !== undefined && { unique_clicks: item.unique_clicks }),
                        ...(item.opportunities !== undefined && { opportunities: item.opportunities }),
                        ...(item.unique_opportunities !== undefined && { unique_opportunities: item.unique_opportunities }),
                        start_date: startDate,
                        end_date: endDate
                    };
                });
                if (records.length > 0) {
                    await nango.batchSave(records, 'CampaignAnalyticsSteps');
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
