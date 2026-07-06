import { z } from 'zod';
import { createAction } from 'nango';

const TimingSchema = z.object({
    from: z.string(),
    to: z.string()
});

const ScheduleSchema = z.object({
    name: z.string(),
    timing: TimingSchema,
    days: z.record(z.string(), z.boolean()),
    timezone: z.string()
});

const CampaignScheduleSchema = z.object({
    start_date: z.string().nullable().optional(),
    end_date: z.string().nullable().optional(),
    schedules: z.array(ScheduleSchema)
});

const VariantSchema = z.object({
    subject: z.string(),
    body: z.string(),
    v_disabled: z.boolean().optional()
});

const StepSchema = z.object({
    type: z.literal('email'),
    delay: z.number(),
    delay_unit: z.union([z.literal('minutes'), z.literal('hours'), z.literal('days')]).optional(),
    pre_delay: z.number().optional(),
    pre_delay_unit: z.union([z.literal('minutes'), z.literal('hours'), z.literal('days')]).optional(),
    variants: z.array(VariantSchema)
});

const SequenceSchema = z.object({
    steps: z.array(StepSchema)
});

const AutoVariantSelectSchema = z.object({
    trigger: z.union([z.literal('reply_rate'), z.literal('click_rate'), z.literal('open_rate')])
});

const LimitEmailsPerCompanyOverrideSchema = z.object({
    mode: z.union([z.literal('custom'), z.literal('disabled')]),
    daily_limit: z.number().optional(),
    scope: z.union([z.literal('per_campaign'), z.literal('across_workspace')]).optional()
});

const ProviderRoutingRuleSchema = z.object({
    action: z.union([z.literal('send'), z.literal('do_not_send')]),
    recipient_esp: z.array(z.union([z.literal('all'), z.literal('google'), z.literal('outlook'), z.literal('other')])),
    sender_esp: z.array(z.union([z.literal('all'), z.literal('google'), z.literal('outlook'), z.literal('other')]))
});

const ProviderCampaignSchema = z.object({
    id: z.string(),
    name: z.string(),
    pl_value: z.number().nullable().optional(),
    status: z.number().optional(),
    is_evergreen: z.boolean().nullable().optional(),
    campaign_schedule: CampaignScheduleSchema,
    sequences: z.array(SequenceSchema).optional(),
    timestamp_created: z.string().optional(),
    timestamp_updated: z.string().optional(),
    email_gap: z.number().nullable().optional(),
    random_wait_max: z.number().nullable().optional(),
    text_only: z.boolean().nullable().optional(),
    first_email_text_only: z.boolean().nullable().optional(),
    email_list: z.array(z.string()).optional(),
    daily_limit: z.number().nullable().optional(),
    stop_on_reply: z.boolean().nullable().optional(),
    email_tag_list: z.array(z.string()).optional(),
    link_tracking: z.boolean().nullable().optional(),
    open_tracking: z.boolean().optional(),
    stop_on_auto_reply: z.boolean().nullable().optional(),
    daily_max_leads: z.number().nullable().optional(),
    prioritize_new_leads: z.boolean().nullable().optional(),
    auto_variant_select: AutoVariantSelectSchema.nullable().optional(),
    match_lead_esp: z.boolean().nullable().optional(),
    not_sending_status: z.number().nullable().optional(),
    stop_for_company: z.boolean().nullable().optional(),
    core_variables: z.record(z.string(), z.unknown()).nullable().optional(),
    custom_variables: z.record(z.string(), z.unknown()).nullable().optional(),
    insert_unsubscribe_header: z.boolean().nullable().optional(),
    allow_risky_contacts: z.boolean().nullable().optional(),
    disable_bounce_protect: z.boolean().nullable().optional(),
    limit_emails_per_company_override: LimitEmailsPerCompanyOverrideSchema.nullable().optional(),
    cc_list: z.array(z.string()).optional(),
    bcc_list: z.array(z.string()).optional(),
    organization: z.string().nullable().optional(),
    owned_by: z.string().nullable().optional(),
    ai_sdr_id: z.string().nullable().optional(),
    provider_routing_rules: z.array(ProviderRoutingRuleSchema).optional()
});

const InputSchema = z.object({
    id: z.string().describe('Campaign ID. Example: "019f1a5b-cfe6-71d3-8678-5ef834392c02"'),
    name: z.string().optional().describe('Name of the campaign'),
    pl_value: z.number().nullable().optional().describe('Value of every positive lead'),
    is_evergreen: z.boolean().nullable().optional().describe('Whether the campaign is evergreen'),
    campaign_schedule: CampaignScheduleSchema.optional().describe('Campaign schedule'),
    sequences: z.array(SequenceSchema).optional().describe('List of sequences'),
    email_gap: z.number().nullable().optional().describe('The gap between emails in minutes'),
    random_wait_max: z.number().nullable().optional().describe('The maximum random wait time in minutes'),
    text_only: z.boolean().nullable().optional().describe('Whether the campaign is text only'),
    first_email_text_only: z.boolean().nullable().optional().describe('Whether the campaign sends the first email as text only'),
    email_list: z.array(z.string()).optional().describe('List of accounts to use for sending emails'),
    daily_limit: z.number().nullable().optional().describe('The daily limit for sending emails'),
    stop_on_reply: z.boolean().nullable().optional().describe('Whether to stop the campaign on reply'),
    email_tag_list: z.array(z.string()).optional().describe('List of tags to use for sending emails'),
    link_tracking: z.boolean().nullable().optional().describe('Whether to track links in emails'),
    open_tracking: z.boolean().optional().describe('Whether to track opens in emails'),
    stop_on_auto_reply: z.boolean().nullable().optional().describe('Whether to stop the campaign on auto reply'),
    daily_max_leads: z.number().nullable().optional().describe('The daily maximum new leads to contact'),
    prioritize_new_leads: z.boolean().nullable().optional().describe('Whether to prioritize new leads'),
    auto_variant_select: AutoVariantSelectSchema.nullable().optional().describe('Auto variant select settings'),
    match_lead_esp: z.boolean().nullable().optional().describe('Whether to match leads by ESP'),
    stop_for_company: z.boolean().nullable().optional().describe('Whether to stop the campaign for the entire company when a lead replies'),
    insert_unsubscribe_header: z.boolean().nullable().optional().describe('Whether to insert an unsubscribe header in emails'),
    allow_risky_contacts: z.boolean().nullable().optional().describe('Whether to allow risky contacts'),
    disable_bounce_protect: z.boolean().nullable().optional().describe('Whether to disable bounce protection'),
    limit_emails_per_company_override: LimitEmailsPerCompanyOverrideSchema.nullable()
        .optional()
        .describe('Overrides the workspace-wide limit emails per company setting'),
    cc_list: z.array(z.string()).optional().describe('List of accounts to CC on emails'),
    bcc_list: z.array(z.string()).optional().describe('List of accounts to BCC on emails'),
    owned_by: z.string().nullable().optional().describe('Owner ID'),
    provider_routing_rules: z.array(ProviderRoutingRuleSchema).optional().describe('Provider routing rules')
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    pl_value: z.number().optional(),
    status: z.number().optional(),
    is_evergreen: z.boolean().optional(),
    campaign_schedule: CampaignScheduleSchema.optional(),
    sequences: z.array(SequenceSchema).optional(),
    timestamp_created: z.string().optional(),
    timestamp_updated: z.string().optional(),
    email_gap: z.number().optional(),
    random_wait_max: z.number().optional(),
    text_only: z.boolean().optional(),
    first_email_text_only: z.boolean().optional(),
    email_list: z.array(z.string()).optional(),
    daily_limit: z.number().optional(),
    stop_on_reply: z.boolean().optional(),
    email_tag_list: z.array(z.string()).optional(),
    link_tracking: z.boolean().optional(),
    open_tracking: z.boolean().optional(),
    stop_on_auto_reply: z.boolean().optional(),
    daily_max_leads: z.number().optional(),
    prioritize_new_leads: z.boolean().optional(),
    auto_variant_select: AutoVariantSelectSchema.optional(),
    match_lead_esp: z.boolean().optional(),
    not_sending_status: z.number().optional(),
    stop_for_company: z.boolean().optional(),
    core_variables: z.record(z.string(), z.unknown()).optional(),
    custom_variables: z.record(z.string(), z.unknown()).optional(),
    insert_unsubscribe_header: z.boolean().optional(),
    allow_risky_contacts: z.boolean().optional(),
    disable_bounce_protect: z.boolean().optional(),
    limit_emails_per_company_override: LimitEmailsPerCompanyOverrideSchema.optional(),
    cc_list: z.array(z.string()).optional(),
    bcc_list: z.array(z.string()).optional(),
    organization: z.string().optional(),
    owned_by: z.string().optional(),
    ai_sdr_id: z.string().optional(),
    provider_routing_rules: z.array(ProviderRoutingRuleSchema).optional()
});

const action = createAction({
    description: 'Patch campaign fields.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['campaigns:update'],
    endpoint: {
        path: '/actions/patch-campaign',
        method: 'POST'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {};

        if (input.name !== undefined) {
            body['name'] = input.name;
        }
        if (input.pl_value !== undefined) {
            body['pl_value'] = input.pl_value;
        }
        if (input.is_evergreen !== undefined) {
            body['is_evergreen'] = input.is_evergreen;
        }
        if (input.campaign_schedule !== undefined) {
            body['campaign_schedule'] = input.campaign_schedule;
        }
        if (input.sequences !== undefined) {
            body['sequences'] = input.sequences;
        }
        if (input.email_gap !== undefined) {
            body['email_gap'] = input.email_gap;
        }
        if (input.random_wait_max !== undefined) {
            body['random_wait_max'] = input.random_wait_max;
        }
        if (input.text_only !== undefined) {
            body['text_only'] = input.text_only;
        }
        if (input.first_email_text_only !== undefined) {
            body['first_email_text_only'] = input.first_email_text_only;
        }
        if (input.email_list !== undefined) {
            body['email_list'] = input.email_list;
        }
        if (input.daily_limit !== undefined) {
            body['daily_limit'] = input.daily_limit;
        }
        if (input.stop_on_reply !== undefined) {
            body['stop_on_reply'] = input.stop_on_reply;
        }
        if (input.email_tag_list !== undefined) {
            body['email_tag_list'] = input.email_tag_list;
        }
        if (input.link_tracking !== undefined) {
            body['link_tracking'] = input.link_tracking;
        }
        if (input.open_tracking !== undefined) {
            body['open_tracking'] = input.open_tracking;
        }
        if (input.stop_on_auto_reply !== undefined) {
            body['stop_on_auto_reply'] = input.stop_on_auto_reply;
        }
        if (input.daily_max_leads !== undefined) {
            body['daily_max_leads'] = input.daily_max_leads;
        }
        if (input.prioritize_new_leads !== undefined) {
            body['prioritize_new_leads'] = input.prioritize_new_leads;
        }
        if (input.auto_variant_select !== undefined) {
            body['auto_variant_select'] = input.auto_variant_select;
        }
        if (input.match_lead_esp !== undefined) {
            body['match_lead_esp'] = input.match_lead_esp;
        }
        if (input.stop_for_company !== undefined) {
            body['stop_for_company'] = input.stop_for_company;
        }
        if (input.insert_unsubscribe_header !== undefined) {
            body['insert_unsubscribe_header'] = input.insert_unsubscribe_header;
        }
        if (input.allow_risky_contacts !== undefined) {
            body['allow_risky_contacts'] = input.allow_risky_contacts;
        }
        if (input.disable_bounce_protect !== undefined) {
            body['disable_bounce_protect'] = input.disable_bounce_protect;
        }
        if (input.limit_emails_per_company_override !== undefined) {
            body['limit_emails_per_company_override'] = input.limit_emails_per_company_override;
        }
        if (input.cc_list !== undefined) {
            body['cc_list'] = input.cc_list;
        }
        if (input.bcc_list !== undefined) {
            body['bcc_list'] = input.bcc_list;
        }
        if (input.owned_by !== undefined) {
            body['owned_by'] = input.owned_by;
        }
        if (input.provider_routing_rules !== undefined) {
            body['provider_routing_rules'] = input.provider_routing_rules;
        }

        // https://developer.instantly.ai/api-reference/campaign/patch-campaign
        const response = await nango.patch({
            endpoint: `/v2/campaigns/${encodeURIComponent(input.id)}`,
            data: body,
            retries: 10
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Campaign not found or update failed',
                campaign_id: input.id
            });
        }

        const campaign = ProviderCampaignSchema.parse(response.data);

        return {
            id: campaign.id,
            name: campaign.name,
            ...(campaign.pl_value != null && { pl_value: campaign.pl_value }),
            ...(campaign.status != null && { status: campaign.status }),
            ...(campaign.is_evergreen != null && { is_evergreen: campaign.is_evergreen }),
            campaign_schedule: campaign.campaign_schedule,
            ...(campaign.sequences != null && { sequences: campaign.sequences }),
            ...(campaign.timestamp_created != null && { timestamp_created: campaign.timestamp_created }),
            ...(campaign.timestamp_updated != null && { timestamp_updated: campaign.timestamp_updated }),
            ...(campaign.email_gap != null && { email_gap: campaign.email_gap }),
            ...(campaign.random_wait_max != null && { random_wait_max: campaign.random_wait_max }),
            ...(campaign.text_only != null && { text_only: campaign.text_only }),
            ...(campaign.first_email_text_only != null && { first_email_text_only: campaign.first_email_text_only }),
            ...(campaign.email_list != null && { email_list: campaign.email_list }),
            ...(campaign.daily_limit != null && { daily_limit: campaign.daily_limit }),
            ...(campaign.stop_on_reply != null && { stop_on_reply: campaign.stop_on_reply }),
            ...(campaign.email_tag_list != null && { email_tag_list: campaign.email_tag_list }),
            ...(campaign.link_tracking != null && { link_tracking: campaign.link_tracking }),
            ...(campaign.open_tracking != null && { open_tracking: campaign.open_tracking }),
            ...(campaign.stop_on_auto_reply != null && { stop_on_auto_reply: campaign.stop_on_auto_reply }),
            ...(campaign.daily_max_leads != null && { daily_max_leads: campaign.daily_max_leads }),
            ...(campaign.prioritize_new_leads != null && { prioritize_new_leads: campaign.prioritize_new_leads }),
            ...(campaign.auto_variant_select != null && { auto_variant_select: campaign.auto_variant_select }),
            ...(campaign.match_lead_esp != null && { match_lead_esp: campaign.match_lead_esp }),
            ...(campaign.not_sending_status != null && { not_sending_status: campaign.not_sending_status }),
            ...(campaign.stop_for_company != null && { stop_for_company: campaign.stop_for_company }),
            ...(campaign.core_variables != null && { core_variables: campaign.core_variables }),
            ...(campaign.custom_variables != null && { custom_variables: campaign.custom_variables }),
            ...(campaign.insert_unsubscribe_header != null && { insert_unsubscribe_header: campaign.insert_unsubscribe_header }),
            ...(campaign.allow_risky_contacts != null && { allow_risky_contacts: campaign.allow_risky_contacts }),
            ...(campaign.disable_bounce_protect != null && { disable_bounce_protect: campaign.disable_bounce_protect }),
            ...(campaign.limit_emails_per_company_override != null && { limit_emails_per_company_override: campaign.limit_emails_per_company_override }),
            ...(campaign.cc_list != null && { cc_list: campaign.cc_list }),
            ...(campaign.bcc_list != null && { bcc_list: campaign.bcc_list }),
            ...(campaign.organization != null && { organization: campaign.organization }),
            ...(campaign.owned_by != null && { owned_by: campaign.owned_by }),
            ...(campaign.ai_sdr_id != null && { ai_sdr_id: campaign.ai_sdr_id }),
            ...(campaign.provider_routing_rules != null && { provider_routing_rules: campaign.provider_routing_rules })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
