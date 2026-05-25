import { z } from 'zod';
import { createAction } from 'nango';

const SegmentOptsSchema = z
    .object({
        match: z.string().optional(),
        conditions: z.array(z.record(z.string(), z.unknown())).optional(),
        saved_segment_id: z.number().optional(),
        prebuilt_segment_id: z.string().optional()
    })
    .optional();

const RecipientsSchema = z
    .object({
        list_id: z.string().optional(),
        segment_opts: SegmentOptsSchema
    })
    .optional();

const SettingsSchema = z
    .object({
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
        fb_comments: z.boolean().optional(),
        template_id: z.number().optional()
    })
    .optional();

const VariateSettingsSchema = z
    .object({
        winner_criteria: z.string().optional(),
        test_size: z.number().optional(),
        wait_time: z.number().optional(),
        from_names: z.array(z.string()).optional(),
        send_times: z.array(z.string()).optional(),
        subject_lines: z.array(z.string()).optional(),
        reply_to_addresses: z.array(z.string()).optional()
    })
    .optional();

const TrackingSchema = z
    .object({
        goal_tracking: z.boolean().optional()
    })
    .optional();

const SocialCardSchema = z
    .object({
        title: z.string().optional(),
        description: z.string().optional(),
        image_url: z.string().optional()
    })
    .optional();

const InputSchema = z.object({
    campaign_id: z.string().describe('The unique ID of the campaign to update.'),
    recipients: RecipientsSchema,
    settings: SettingsSchema,
    variate_settings: VariateSettingsSchema,
    tracking: TrackingSchema,
    social_card: SocialCardSchema
});

const CampaignRecipientsSchema = z.object({
    list_id: z.string().optional(),
    list_is_active: z.boolean().optional(),
    list_name: z.string().optional(),
    segment_text: z.string().optional(),
    recipient_count: z.number().optional()
});

const CampaignSettingsSchema = z.object({
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
    fb_comments: z.boolean().optional(),
    template_id: z.number().optional()
});

const CampaignTrackingSchema = z.object({
    goal_tracking: z.boolean().optional()
});

const CampaignSchema = z.object({
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
    recipients: CampaignRecipientsSchema.optional(),
    settings: CampaignSettingsSchema.optional(),
    tracking: CampaignTrackingSchema.optional()
});

const OutputSchema = z.object({
    id: z.string(),
    web_id: z.number().optional(),
    type: z.string().optional(),
    create_time: z.string().optional(),
    archive_url: z.string().optional(),
    long_archive_url: z.string().optional(),
    status: z.string().optional(),
    emails_sent: z.number().optional(),
    send_time: z.string().optional(),
    content_type: z.string().optional(),
    needs_block_refresh: z.boolean().optional(),
    recipients: CampaignRecipientsSchema.optional(),
    settings: CampaignSettingsSchema.optional(),
    tracking: CampaignTrackingSchema.optional()
});

const action = createAction({
    description: 'Update a campaign in Mailchimp.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-campaign',
        group: 'Campaigns'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['campaigns:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: Record<string, unknown> = {};

        if (input['recipients'] !== undefined) {
            data['recipients'] = input['recipients'];
        }
        if (input['settings'] !== undefined) {
            data['settings'] = input['settings'];
        }
        if (input['variate_settings'] !== undefined) {
            data['variate_settings'] = input['variate_settings'];
        }
        if (input['tracking'] !== undefined) {
            data['tracking'] = input['tracking'];
        }
        if (input['social_card'] !== undefined) {
            data['social_card'] = input['social_card'];
        }

        // https://mailchimp.com/developer/marketing/api/campaigns/
        const response = await nango.patch({
            endpoint: `/3.0/campaigns/${encodeURIComponent(input['campaign_id'])}`,
            data,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Campaign not found or update failed.',
                campaign_id: input['campaign_id']
            });
        }

        const campaign = CampaignSchema.parse(response.data);

        return {
            id: campaign['id'],
            ...(campaign['web_id'] !== undefined && { web_id: campaign['web_id'] }),
            ...(campaign['type'] !== undefined && { type: campaign['type'] }),
            ...(campaign['create_time'] !== undefined && { create_time: campaign['create_time'] }),
            ...(campaign['archive_url'] !== undefined && { archive_url: campaign['archive_url'] }),
            ...(campaign['long_archive_url'] !== undefined && { long_archive_url: campaign['long_archive_url'] }),
            ...(campaign['status'] !== undefined && { status: campaign['status'] }),
            ...(campaign['emails_sent'] !== undefined && { emails_sent: campaign['emails_sent'] }),
            ...(campaign['send_time'] != null && { send_time: campaign['send_time'] }),
            ...(campaign['content_type'] !== undefined && { content_type: campaign['content_type'] }),
            ...(campaign['needs_block_refresh'] !== undefined && { needs_block_refresh: campaign['needs_block_refresh'] }),
            ...(campaign['recipients'] !== undefined && { recipients: campaign['recipients'] }),
            ...(campaign['settings'] !== undefined && { settings: campaign['settings'] }),
            ...(campaign['tracking'] !== undefined && { tracking: campaign['tracking'] })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
