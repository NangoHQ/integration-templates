import { z } from 'zod';
import { createAction } from 'nango';

const CampaignSettingsSchema = z
    .object({
        subject_line: z.string().optional(),
        title: z.string().optional(),
        from_name: z.string().optional(),
        reply_to: z.string().optional(),
        template_id: z.number().optional()
    })
    .passthrough();

const CampaignRecipientsSchema = z
    .object({
        list_id: z.string().optional(),
        list_is_active: z.boolean().optional(),
        list_name: z.string().optional(),
        segment_text: z.string().optional(),
        recipient_count: z.number().optional()
    })
    .passthrough();

const CampaignReportSummarySchema = z
    .object({
        opens: z.number().optional(),
        unique_opens: z.number().optional(),
        open_rate: z.number().optional(),
        clicks: z.number().optional(),
        subscriber_clicks: z.number().optional(),
        click_rate: z.number().optional(),
        ecommerce: z
            .object({
                total_orders: z.number().optional(),
                total_spent: z.number().optional(),
                total_revenue: z.number().optional()
            })
            .passthrough()
            .optional()
    })
    .passthrough();

const ProviderCampaignSchema = z
    .object({
        id: z.string(),
        web_id: z.number().optional(),
        type: z.string().optional(),
        create_time: z.string().optional(),
        archive_url: z.string().optional(),
        long_archive_url: z.string().optional(),
        status: z.string().optional(),
        emails_sent: z.number().optional(),
        send_time: z.string().nullable().optional(),
        content_type: z.string().optional(),
        needs_block_refresh: z.boolean().optional(),
        resendable: z.boolean().optional(),
        settings: CampaignSettingsSchema.optional(),
        recipients: CampaignRecipientsSchema.optional(),
        report_summary: CampaignReportSummarySchema.nullable().optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    campaigns: z.array(ProviderCampaignSchema).optional(),
    total_items: z.number().optional()
});

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (offset) from the previous response. Omit for the first page.'),
    count: z.number().min(1).max(1000).optional().describe('The number of records to return. Default is 10. Maximum is 1000.'),
    status: z.string().optional().describe('The status of the campaign.'),
    type: z.string().optional().describe('The campaign type.'),
    list_id: z.string().optional().describe('The unique id for the list.'),
    folder_id: z.string().optional().describe('The unique folder id.'),
    since_create_time: z.string().optional().describe('Restrict results to campaigns created after this time (ISO 8601).'),
    before_create_time: z.string().optional().describe('Restrict results to campaigns created before this time (ISO 8601).'),
    since_send_time: z.string().optional().describe('Restrict results to campaigns sent after this time (ISO 8601).'),
    before_send_time: z.string().optional().describe('Restrict results to campaigns sent before this time (ISO 8601).')
});

const OutputCampaignSchema = z.object({
    id: z.string(),
    web_id: z.number().optional(),
    type: z.string().optional(),
    create_time: z.string().optional(),
    status: z.string().optional(),
    emails_sent: z.number().optional(),
    send_time: z.string().optional(),
    content_type: z.string().optional(),
    settings: z
        .object({
            subject_line: z.string().optional(),
            title: z.string().optional(),
            from_name: z.string().optional(),
            reply_to: z.string().optional(),
            template_id: z.number().optional()
        })
        .optional(),
    recipients: z
        .object({
            list_id: z.string().optional(),
            list_name: z.string().optional(),
            recipient_count: z.number().optional()
        })
        .optional(),
    report_summary: z
        .object({
            opens: z.number().optional(),
            unique_opens: z.number().optional(),
            open_rate: z.number().optional(),
            clicks: z.number().optional(),
            subscriber_clicks: z.number().optional(),
            click_rate: z.number().optional()
        })
        .optional()
});

const OutputSchema = z.object({
    items: z.array(OutputCampaignSchema),
    total_items: z.number(),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List campaigns from Mailchimp.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-campaigns',
        group: 'Campaigns'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const offset = input.cursor ? parseInt(input.cursor, 10) : 0;
        const count = input.count ?? 10;

        // https://mailchimp.com/developer/marketing/api/campaigns/list-campaigns/
        const response = await nango.get({
            endpoint: '/3.0/campaigns',
            params: {
                count: String(count),
                offset: String(offset),
                ...(input.status !== undefined && { status: input.status }),
                ...(input.type !== undefined && { type: input.type }),
                ...(input.list_id !== undefined && { list_id: input.list_id }),
                ...(input.folder_id !== undefined && { folder_id: input.folder_id }),
                ...(input.since_create_time !== undefined && { since_create_time: input.since_create_time }),
                ...(input.before_create_time !== undefined && { before_create_time: input.before_create_time }),
                ...(input.since_send_time !== undefined && { since_send_time: input.since_send_time }),
                ...(input.before_send_time !== undefined && { before_send_time: input.before_send_time })
            },
            retries: 3
        });

        const providerData = ProviderResponseSchema.parse(response.data);
        const campaigns = providerData.campaigns ?? [];
        const totalItems = providerData.total_items ?? 0;

        const items = campaigns.map((campaign) => {
            const settings = campaign.settings;
            const recipients = campaign.recipients;
            const reportSummary = campaign.report_summary;

            return {
                id: campaign.id,
                ...(campaign.web_id !== undefined && { web_id: campaign.web_id }),
                ...(campaign.type !== undefined && { type: campaign.type }),
                ...(campaign.create_time !== undefined && { create_time: campaign.create_time }),
                ...(campaign.status !== undefined && { status: campaign.status }),
                ...(campaign.emails_sent !== undefined && { emails_sent: campaign.emails_sent }),
                ...(campaign.send_time != null && { send_time: campaign.send_time }),
                ...(campaign.content_type !== undefined && { content_type: campaign.content_type }),
                ...(settings !== undefined && {
                    settings: {
                        ...(settings.subject_line !== undefined && { subject_line: settings.subject_line }),
                        ...(settings.title !== undefined && { title: settings.title }),
                        ...(settings.from_name !== undefined && { from_name: settings.from_name }),
                        ...(settings.reply_to !== undefined && { reply_to: settings.reply_to }),
                        ...(settings.template_id !== undefined && { template_id: settings.template_id })
                    }
                }),
                ...(recipients !== undefined && {
                    recipients: {
                        ...(recipients.list_id !== undefined && { list_id: recipients.list_id }),
                        ...(recipients.list_name !== undefined && { list_name: recipients.list_name }),
                        ...(recipients.recipient_count !== undefined && { recipient_count: recipients.recipient_count })
                    }
                }),
                ...(reportSummary != null && {
                    report_summary: {
                        ...(reportSummary.opens !== undefined && { opens: reportSummary.opens }),
                        ...(reportSummary.unique_opens !== undefined && { unique_opens: reportSummary.unique_opens }),
                        ...(reportSummary.open_rate !== undefined && { open_rate: reportSummary.open_rate }),
                        ...(reportSummary.clicks !== undefined && { clicks: reportSummary.clicks }),
                        ...(reportSummary.subscriber_clicks !== undefined && { subscriber_clicks: reportSummary.subscriber_clicks }),
                        ...(reportSummary.click_rate !== undefined && { click_rate: reportSummary.click_rate })
                    }
                })
            };
        });

        const nextOffset = offset + count;
        const next_cursor = nextOffset < totalItems ? String(nextOffset) : undefined;

        return {
            items,
            total_items: totalItems,
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
