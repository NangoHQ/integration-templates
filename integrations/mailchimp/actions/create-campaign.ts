import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const SegmentOptsSchema = z.object({
    saved_segment_id: z.number().optional(),
    match: z.string().optional(),
    conditions: z.array(z.unknown()).optional()
});

const RecipientsSchema = z.object({
    list_id: z.string().describe('Audience/list ID. Example: "a1b2c3d4e5"'),
    segment_opts: SegmentOptsSchema.optional()
});

const SettingsSchema = z.object({
    subject_line: z.string().optional(),
    preview_text: z.string().optional(),
    title: z.string().optional(),
    from_name: z.string().optional(),
    reply_to: z.string().optional(),
    template_id: z.number().optional()
});

const TrackingSchema = z.object({
    opens: z.boolean().optional(),
    html_clicks: z.boolean().optional(),
    text_clicks: z.boolean().optional(),
    google_analytics: z.string().optional()
});

const RssOptsSchema = z.object({
    feed_url: z.string().optional(),
    frequency: z.string().optional()
});

const VariateSettingsSchema = z.object({
    winner_criteria: z.string().optional(),
    wait_time: z.number().optional(),
    test_size: z.number().optional(),
    subject_lines: z.array(z.string()).optional(),
    send_times: z.array(z.string()).optional(),
    from_names: z.array(z.string()).optional(),
    reply_to_addresses: z.array(z.string()).optional()
});

const SocialCardSchema = z.object({
    image_url: z.string().optional(),
    description: z.string().optional(),
    title: z.string().optional()
});

const InputSchema = z.object({
    type: z.enum(['regular', 'plaintext', 'absplit', 'rss', 'variate']).describe('Campaign type. Example: "regular"'),
    recipients: RecipientsSchema,
    settings: SettingsSchema.optional(),
    tracking: TrackingSchema.optional(),
    rss_opts: RssOptsSchema.optional(),
    variate_settings: VariateSettingsSchema.optional(),
    social_card: SocialCardSchema.optional()
});

const ProviderRecipientsSchema = z.object({
    list_id: z.string(),
    list_name: z.string().optional(),
    recipient_count: z.number().optional()
});

const ProviderSettingsSchema = z.object({
    subject_line: z.string().optional(),
    preview_text: z.string().optional(),
    title: z.string().optional(),
    from_name: z.string().optional(),
    reply_to: z.string().optional(),
    template_id: z.number().optional()
});

const ProviderCampaignSchema = z.object({
    id: z.string(),
    web_id: z.number(),
    type: z.string(),
    status: z.string(),
    create_time: z.string().optional(),
    settings: ProviderSettingsSchema.optional(),
    recipients: ProviderRecipientsSchema.optional()
});

const OutputSchema = z.object({
    id: z.string(),
    web_id: z.number(),
    type: z.string(),
    status: z.string(),
    create_time: z.string().optional(),
    settings: SettingsSchema.optional(),
    recipients: z
        .object({
            list_id: z.string(),
            list_name: z.string().optional(),
            recipient_count: z.number().optional()
        })
        .optional()
});

const action = createAction({
    description: 'Create a campaign in Mailchimp.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['campaigns'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const payload: Record<string, unknown> = {
            type: input.type,
            recipients: {
                list_id: input.recipients.list_id,
                ...(input.recipients.segment_opts !== undefined && { segment_opts: input.recipients.segment_opts })
            },
            ...(input.settings !== undefined && { settings: input.settings }),
            ...(input.tracking !== undefined && { tracking: input.tracking }),
            ...(input.rss_opts !== undefined && { rss_opts: input.rss_opts }),
            ...(input.variate_settings !== undefined && { variate_settings: input.variate_settings }),
            ...(input.social_card !== undefined && { social_card: input.social_card })
        };

        const config: ProxyConfiguration = {
            // https://mailchimp.com/developer/marketing/api/campaigns/add-campaign/
            endpoint: '/3.0/campaigns',
            data: payload,
            retries: 3
        };

        const response = await nango.post(config);

        const campaign = ProviderCampaignSchema.parse(response.data);

        return {
            id: campaign.id,
            web_id: campaign.web_id,
            type: campaign.type,
            status: campaign.status,
            ...(campaign.create_time !== undefined && { create_time: campaign.create_time }),
            ...(campaign.settings !== undefined && {
                settings: {
                    ...(campaign.settings.subject_line !== undefined && { subject_line: campaign.settings.subject_line }),
                    ...(campaign.settings.preview_text !== undefined && { preview_text: campaign.settings.preview_text }),
                    ...(campaign.settings.title !== undefined && { title: campaign.settings.title }),
                    ...(campaign.settings.from_name !== undefined && { from_name: campaign.settings.from_name }),
                    ...(campaign.settings.reply_to !== undefined && { reply_to: campaign.settings.reply_to }),
                    ...(campaign.settings.template_id !== undefined && { template_id: campaign.settings.template_id })
                }
            }),
            ...(campaign.recipients !== undefined && {
                recipients: {
                    list_id: campaign.recipients.list_id,
                    ...(campaign.recipients.list_name !== undefined && { list_name: campaign.recipients.list_name }),
                    ...(campaign.recipients.recipient_count !== undefined && { recipient_count: campaign.recipients.recipient_count })
                }
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
