import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    campaign_id: z.string().describe('The unique ID of the campaign. Example: "abc123"')
});

const BouncesSchema = z.object({
    hard_bounces: z.number().optional(),
    soft_bounces: z.number().optional(),
    syntax_errors: z.number().optional()
});

const ForwardsSchema = z.object({
    forwards_count: z.number().optional(),
    forwards_opens: z.number().optional()
});

const OpensSchema = z.object({
    opens_total: z.number().optional(),
    unique_opens: z.number().optional(),
    open_rate: z.number().optional(),
    last_open: z.string().optional()
});

const ClicksSchema = z.object({
    clicks_total: z.number().optional(),
    unique_clicks: z.number().optional(),
    unique_subscriber_clicks: z.number().optional(),
    click_rate: z.number().optional(),
    last_click: z.string().optional()
});

const IndustryStatsSchema = z.object({
    type: z.string().optional(),
    open_rate: z.number().optional(),
    click_rate: z.number().optional(),
    bounce_rate: z.number().optional(),
    unopen_rate: z.number().optional(),
    unsub_rate: z.number().optional(),
    abuse_rate: z.number().optional()
});

const ListStatsSchema = z.object({
    sub_rate: z.number().optional(),
    unsub_rate: z.number().optional(),
    open_rate: z.number().optional(),
    click_rate: z.number().optional()
});

const EcommerceSchema = z.object({
    total_orders: z.number().optional(),
    total_spent: z.number().optional(),
    total_revenue: z.number().optional(),
    currency_code: z.string().optional()
});

const DeliveryStatusSchema = z.object({
    enabled: z.boolean().optional(),
    can_cancel: z.boolean().optional(),
    status: z.string().optional(),
    emails_sent: z.number().optional(),
    emails_canceled: z.number().optional()
});

const ProviderReportSchema = z
    .object({
        id: z.string().optional(),
        campaign_title: z.string().optional(),
        type: z.string().optional(),
        list_id: z.string().optional(),
        list_is_active: z.boolean().optional(),
        list_name: z.string().optional(),
        subject_line: z.string().optional(),
        preview_text: z.string().optional(),
        emails_sent: z.number().optional(),
        abuse_reports: z.number().optional(),
        unsubscribed: z.number().optional(),
        send_time: z.string().optional(),
        bounces: BouncesSchema.optional(),
        forwards: ForwardsSchema.optional(),
        opens: OpensSchema.optional(),
        clicks: ClicksSchema.optional(),
        industry_stats: IndustryStatsSchema.optional(),
        list_stats: ListStatsSchema.optional(),
        ecommerce: EcommerceSchema.optional(),
        delivery_status: DeliveryStatusSchema.optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string().optional(),
    campaign_title: z.string().optional(),
    type: z.string().optional(),
    list_id: z.string().optional(),
    list_is_active: z.boolean().optional(),
    list_name: z.string().optional(),
    subject_line: z.string().optional(),
    preview_text: z.string().optional(),
    emails_sent: z.number().optional(),
    abuse_reports: z.number().optional(),
    unsubscribed: z.number().optional(),
    send_time: z.string().optional(),
    bounces: BouncesSchema.optional(),
    forwards: ForwardsSchema.optional(),
    opens: OpensSchema.optional(),
    clicks: ClicksSchema.optional(),
    industry_stats: IndustryStatsSchema.optional(),
    list_stats: ListStatsSchema.optional(),
    ecommerce: EcommerceSchema.optional(),
    delivery_status: DeliveryStatusSchema.optional()
});

const action = createAction({
    description: 'Retrieve a Mailchimp campaign report.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-campaign-report',
        group: 'Reports'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://mailchimp.com/developer/marketing/api/reports/get-campaign-report/
            endpoint: `/3.0/reports/${encodeURIComponent(input.campaign_id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Campaign report not found',
                campaign_id: input.campaign_id
            });
        }

        const report = ProviderReportSchema.parse(response.data);

        return {
            id: report.id,
            campaign_title: report.campaign_title,
            type: report.type,
            list_id: report.list_id,
            list_is_active: report.list_is_active,
            list_name: report.list_name,
            subject_line: report.subject_line,
            preview_text: report.preview_text,
            emails_sent: report.emails_sent,
            abuse_reports: report.abuse_reports,
            unsubscribed: report.unsubscribed,
            send_time: report.send_time,
            bounces: report.bounces,
            forwards: report.forwards,
            opens: report.opens,
            clicks: report.clicks,
            industry_stats: report.industry_stats,
            list_stats: report.list_stats,
            ecommerce: report.ecommerce,
            delivery_status: report.delivery_status
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
