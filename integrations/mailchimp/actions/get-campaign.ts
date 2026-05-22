import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    campaign_id: z.string().describe('The unique id for the campaign. Example: "a1b2c3d4e5"')
});

const LinkSchema = z.object({
    rel: z.string().optional(),
    href: z.string().optional(),
    method: z.string().optional(),
    targetSchema: z.string().optional(),
    schema: z.string().optional()
});

const RecipientsSchema = z.object({
    list_id: z.string().optional(),
    list_is_active: z.boolean().optional(),
    list_name: z.string().optional(),
    segment_text: z.string().optional(),
    recipient_count: z.number().optional(),
    segment_opts: z.record(z.string(), z.unknown()).optional()
});

const SettingsSchema = z.object({
    subject_line: z.string().optional(),
    preview_text: z.string().optional(),
    title: z.string().optional(),
    from_name: z.string().optional(),
    reply_to: z.string().optional(),
    use_conversation: z.boolean().optional(),
    to_name: z.string().optional(),
    folder_id: z.string().optional(),
    authenticate: z.boolean().optional(),
    auto_footer: z.boolean().optional(),
    inline_css: z.boolean().optional(),
    auto_tweet: z.boolean().optional(),
    auto_fb_post: z.array(z.string()).optional(),
    fb_comments: z.boolean().optional(),
    timewarp: z.boolean().optional(),
    template_id: z.number().optional(),
    drag_and_drop: z.boolean().optional()
});

const VariateSettingsSchema = z.object({
    winner_criteria: z.string().optional(),
    wait_time: z.number().optional(),
    test_size: z.number().optional(),
    subject_lines: z.array(z.string()).optional(),
    send_times: z.array(z.string()).optional(),
    from_names: z.array(z.string()).optional(),
    reply_to_addresses: z.array(z.string()).optional(),
    contents: z.array(z.string()).optional(),
    combinations: z.array(z.record(z.string(), z.unknown())).optional()
});

const TrackingSchema = z.object({
    opens: z.boolean().optional(),
    html_clicks: z.boolean().optional(),
    text_clicks: z.boolean().optional(),
    goal_tracking: z.boolean().optional(),
    ecomm360: z.boolean().optional(),
    google_analytics: z.string().optional(),
    clicktale: z.string().optional(),
    salesforce: z.record(z.string(), z.unknown()).optional(),
    capsule: z.record(z.string(), z.unknown()).optional()
});

const RssOptsSchema = z.object({
    feed_url: z.string().optional(),
    frequency: z.string().optional(),
    schedule: z.record(z.string(), z.unknown()).optional(),
    last_sent: z.string().optional(),
    constrain_rss_img: z.boolean().optional()
});

const AbSplitOptsSchema = z.object({
    split_test: z.string().optional(),
    pick_winner: z.string().optional(),
    wait_units: z.string().optional(),
    wait_time: z.number().optional(),
    split_size: z.number().optional(),
    from_name_a: z.string().optional(),
    from_name_b: z.string().optional(),
    reply_email_a: z.string().optional(),
    reply_email_b: z.string().optional(),
    subject_a: z.string().optional(),
    subject_b: z.string().optional(),
    send_time_a: z.string().optional(),
    send_time_b: z.string().optional()
});

const SocialCardSchema = z.object({
    image_url: z.string().optional(),
    description: z.string().optional(),
    title: z.string().optional()
});

const ReportSummarySchema = z.object({
    opens: z.number().optional(),
    unique_opens: z.number().optional(),
    open_rate: z.number().optional(),
    clicks: z.number().optional(),
    subscriber_clicks: z.number().optional(),
    click_rate: z.number().optional(),
    ecommerce: z.record(z.string(), z.unknown()).optional()
});

const DeliveryStatusSchema = z.object({
    enabled: z.boolean().optional(),
    can_cancel: z.boolean().optional(),
    status: z.string().optional(),
    emails_sent: z.number().optional(),
    emails_canceled: z.number().optional()
});

const ResendShortcutEligibilitySchema = z.object({
    to_non_openers: z.record(z.string(), z.unknown()).optional(),
    to_new_subscribers: z.record(z.string(), z.unknown()).optional(),
    to_non_clickers: z.record(z.string(), z.unknown()).optional(),
    to_non_purchasers: z.record(z.string(), z.unknown()).optional()
});

const ResendShortcutUsageSchema = z.object({
    shortcut_campaigns: z.array(z.record(z.string(), z.unknown())).optional(),
    original_campaign: z.record(z.string(), z.unknown()).optional()
});

const ProviderCampaignSchema = z
    .object({
        id: z.string(),
        web_id: z.number().optional(),
        parent_campaign_id: z.string().optional(),
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
        recipients: RecipientsSchema.optional(),
        settings: SettingsSchema.optional(),
        variate_settings: VariateSettingsSchema.optional(),
        tracking: TrackingSchema.optional(),
        rss_opts: RssOptsSchema.optional(),
        ab_split_opts: AbSplitOptsSchema.optional(),
        social_card: SocialCardSchema.optional(),
        report_summary: ReportSummarySchema.optional(),
        delivery_status: DeliveryStatusSchema.optional(),
        resend_shortcut_eligibility: ResendShortcutEligibilitySchema.optional(),
        resend_shortcut_usage: ResendShortcutUsageSchema.optional(),
        _links: z.array(LinkSchema).optional()
    })
    .passthrough();

const action = createAction({
    description: 'Retrieve a single campaign from Mailchimp.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-campaign',
        group: 'Campaigns'
    },
    input: InputSchema,
    output: ProviderCampaignSchema,
    scopes: ['campaigns_read'],

    exec: async (nango, input): Promise<z.infer<typeof ProviderCampaignSchema>> => {
        // https://mailchimp.com/developer/marketing/api/campaigns/get-campaign-info/
        const response = await nango.get({
            endpoint: '/3.0/campaigns/' + encodeURIComponent(input.campaign_id),
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Campaign not found',
                campaign_id: input.campaign_id
            });
        }

        const campaign = ProviderCampaignSchema.parse(response.data);
        return campaign;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
