import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const TimezoneEnum = z.enum([
    'Etc/GMT+1',
    'Etc/GMT+2',
    'Etc/GMT+3',
    'Etc/GMT+4',
    'Etc/GMT+5',
    'Etc/GMT+6',
    'Etc/GMT+7',
    'Etc/GMT+8',
    'Etc/GMT+9',
    'Etc/GMT+10',
    'Etc/GMT+11',
    'Etc/GMT+12',
    'Etc/GMT-1',
    'Etc/GMT-2',
    'Etc/GMT-3',
    'Etc/GMT-4',
    'Etc/GMT-5',
    'Etc/GMT-6',
    'Etc/GMT-7',
    'Etc/GMT-8',
    'Etc/GMT-9',
    'Etc/GMT-10',
    'Etc/GMT-11',
    'Etc/GMT-12'
]);

const TimingSchema = z.object({
    from: z.string().regex(/^([01][0-9]|2[0-3]):([0-5][0-9])$/),
    to: z.string().regex(/^([01][0-9]|2[0-3]):([0-5][0-9])$/)
});

const DaysSchema = z.object({
    '0': z.boolean().optional(),
    '1': z.boolean().optional(),
    '2': z.boolean().optional(),
    '3': z.boolean().optional(),
    '4': z.boolean().optional(),
    '5': z.boolean().optional(),
    '6': z.boolean().optional()
});

const ScheduleSchema = z.object({
    name: z.string(),
    timing: TimingSchema,
    days: DaysSchema,
    timezone: TimezoneEnum
});

const CampaignScheduleSchema = z.object({
    start_date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .nullable()
        .optional(),
    end_date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .nullable()
        .optional(),
    schedules: z.array(ScheduleSchema).min(1)
});

const VariantSchema = z.object({
    subject: z.string(),
    body: z.string(),
    v_disabled: z.boolean().optional()
});

const StepSchema = z.object({
    type: z.literal('email'),
    delay: z.number(),
    delay_unit: z.enum(['minutes', 'hours', 'days']).optional(),
    pre_delay: z.number().optional(),
    pre_delay_unit: z.enum(['minutes', 'hours', 'days']).optional(),
    variants: z.array(VariantSchema).min(1)
});

const SequenceSchema = z.object({
    steps: z.array(StepSchema).min(1)
});

const ProviderRoutingRuleSchema = z.object({
    action: z.enum(['send', 'do_not_send']),
    recipient_esp: z.array(z.enum(['all', 'google', 'outlook', 'other'])),
    sender_esp: z.array(z.enum(['all', 'google', 'outlook', 'other']))
});

const LimitEmailsPerCompanyOverrideSchema = z.object({
    mode: z.enum(['custom', 'disabled']),
    daily_limit: z.number().min(1).optional(),
    scope: z.enum(['per_campaign', 'across_workspace']).optional()
});

const AutoVariantSelectSchema = z.object({
    trigger: z.enum(['reply_rate', 'click_rate', 'open_rate'])
});

const InputSchema = z.object({
    name: z.string(),
    pl_value: z.number().nullable().optional(),
    is_evergreen: z.boolean().nullable().optional(),
    campaign_schedule: CampaignScheduleSchema,
    sequences: z.array(SequenceSchema).optional(),
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
    daily_max_leads: z.number().int().min(0).nullable().optional(),
    prioritize_new_leads: z.boolean().nullable().optional(),
    auto_variant_select: AutoVariantSelectSchema.nullable().optional(),
    match_lead_esp: z.boolean().nullable().optional(),
    stop_for_company: z.boolean().nullable().optional(),
    insert_unsubscribe_header: z.boolean().nullable().optional(),
    allow_risky_contacts: z.boolean().nullable().optional(),
    disable_bounce_protect: z.boolean().nullable().optional(),
    limit_emails_per_company_override: LimitEmailsPerCompanyOverrideSchema.nullable().optional(),
    cc_list: z.array(z.string()).optional(),
    bcc_list: z.array(z.string()).optional(),
    owned_by: z.string().uuid().nullable().optional(),
    ai_sdr_id: z.string().uuid().nullable().optional(),
    provider_routing_rules: z.array(ProviderRoutingRuleSchema).optional()
});

const ProviderCampaignScheduleSchema = z.object({
    start_date: z.string().nullable().optional(),
    end_date: z.string().nullable().optional(),
    schedules: z.array(
        z.object({
            name: z.string(),
            timing: TimingSchema,
            days: DaysSchema,
            timezone: z.string()
        })
    )
});

const ProviderSequenceSchema = z.object({
    steps: z.array(
        z.object({
            type: z.literal('email'),
            delay: z.number(),
            delay_unit: z.string().optional(),
            pre_delay: z.number().optional(),
            pre_delay_unit: z.string().optional(),
            variants: z.array(
                z.object({
                    subject: z.string(),
                    body: z.string(),
                    v_disabled: z.boolean().optional()
                })
            )
        })
    )
});

const ProviderLimitEmailsPerCompanyOverrideSchema = z.object({
    mode: z.string(),
    daily_limit: z.number().optional(),
    scope: z.string().optional()
});

const ProviderAutoVariantSelectSchema = z.object({
    trigger: z.string()
});

const ProviderRoutingRuleResponseSchema = z.object({
    action: z.string(),
    recipient_esp: z.array(z.string()),
    sender_esp: z.array(z.string())
});

const ProviderCampaignSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    pl_value: z.number().nullable().optional(),
    status: z.number(),
    is_evergreen: z.boolean().nullable().optional(),
    campaign_schedule: ProviderCampaignScheduleSchema,
    sequences: z.array(ProviderSequenceSchema).optional(),
    timestamp_created: z.string(),
    timestamp_updated: z.string(),
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
    auto_variant_select: ProviderAutoVariantSelectSchema.nullable().optional(),
    match_lead_esp: z.boolean().nullable().optional(),
    not_sending_status: z.number().nullable().optional(),
    stop_for_company: z.boolean().nullable().optional(),
    core_variables: z.record(z.string(), z.unknown()).nullable().optional(),
    custom_variables: z.record(z.string(), z.unknown()).nullable().optional(),
    insert_unsubscribe_header: z.boolean().nullable().optional(),
    allow_risky_contacts: z.boolean().nullable().optional(),
    disable_bounce_protect: z.boolean().nullable().optional(),
    limit_emails_per_company_override: ProviderLimitEmailsPerCompanyOverrideSchema.nullable().optional(),
    cc_list: z.array(z.string()).optional(),
    bcc_list: z.array(z.string()).optional(),
    organization: z.string().uuid().nullable().optional(),
    owned_by: z.string().uuid().nullable().optional(),
    ai_sdr_id: z.string().uuid().nullable().optional(),
    provider_routing_rules: z.array(ProviderRoutingRuleResponseSchema).optional()
});

const OutputSchema = ProviderCampaignSchema;

const action = createAction({
    description: 'Create an Instantly campaign.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['campaigns:create'],

    exec: async (nango, input) => {
        const data = {
            name: input.name,
            campaign_schedule: input.campaign_schedule,
            ...(input.pl_value !== undefined && { pl_value: input.pl_value }),
            ...(input.is_evergreen !== undefined && { is_evergreen: input.is_evergreen }),
            ...(input.sequences !== undefined && { sequences: input.sequences }),
            ...(input.email_gap !== undefined && { email_gap: input.email_gap }),
            ...(input.random_wait_max !== undefined && { random_wait_max: input.random_wait_max }),
            ...(input.text_only !== undefined && { text_only: input.text_only }),
            ...(input.first_email_text_only !== undefined && { first_email_text_only: input.first_email_text_only }),
            ...(input.email_list !== undefined && { email_list: input.email_list }),
            ...(input.daily_limit !== undefined && { daily_limit: input.daily_limit }),
            ...(input.stop_on_reply !== undefined && { stop_on_reply: input.stop_on_reply }),
            ...(input.email_tag_list !== undefined && { email_tag_list: input.email_tag_list }),
            ...(input.link_tracking !== undefined && { link_tracking: input.link_tracking }),
            ...(input.open_tracking !== undefined && { open_tracking: input.open_tracking }),
            ...(input.stop_on_auto_reply !== undefined && { stop_on_auto_reply: input.stop_on_auto_reply }),
            ...(input.daily_max_leads !== undefined && { daily_max_leads: input.daily_max_leads }),
            ...(input.prioritize_new_leads !== undefined && { prioritize_new_leads: input.prioritize_new_leads }),
            ...(input.auto_variant_select !== undefined && { auto_variant_select: input.auto_variant_select }),
            ...(input.match_lead_esp !== undefined && { match_lead_esp: input.match_lead_esp }),
            ...(input.stop_for_company !== undefined && { stop_for_company: input.stop_for_company }),
            ...(input.insert_unsubscribe_header !== undefined && { insert_unsubscribe_header: input.insert_unsubscribe_header }),
            ...(input.allow_risky_contacts !== undefined && { allow_risky_contacts: input.allow_risky_contacts }),
            ...(input.disable_bounce_protect !== undefined && { disable_bounce_protect: input.disable_bounce_protect }),
            ...(input.limit_emails_per_company_override !== undefined && { limit_emails_per_company_override: input.limit_emails_per_company_override }),
            ...(input.cc_list !== undefined && { cc_list: input.cc_list }),
            ...(input.bcc_list !== undefined && { bcc_list: input.bcc_list }),
            ...(input.owned_by !== undefined && { owned_by: input.owned_by }),
            ...(input.ai_sdr_id !== undefined && { ai_sdr_id: input.ai_sdr_id }),
            ...(input.provider_routing_rules !== undefined && { provider_routing_rules: input.provider_routing_rules })
        };

        const config: ProxyConfiguration = {
            // https://developer.instantly.ai/api-reference/campaign/create-campaign
            endpoint: '/v2/campaigns',
            data,
            retries: 10
        };

        const response = await nango.post(config);

        const campaign = ProviderCampaignSchema.parse(response.data);

        return campaign;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
