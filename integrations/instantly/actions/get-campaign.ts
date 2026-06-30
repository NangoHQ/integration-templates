import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The campaign ID. Example: "9b6f458e-6dc5-4762-83d5-a528aedd2235"')
});

const TimingSchema = z.object({
    from: z.string().optional(),
    to: z.string().optional()
});

const ScheduleSchema = z.object({
    name: z.string().optional(),
    timing: TimingSchema.optional(),
    days: z.record(z.string(), z.boolean()).optional(),
    timezone: z.string().optional()
});

const CampaignScheduleSchema = z.object({
    start_date: z.string().nullable().optional(),
    end_date: z.string().nullable().optional(),
    schedules: z.array(ScheduleSchema).optional()
});

const VariantSchema = z.object({
    subject: z.string().optional(),
    body: z.string().optional(),
    v_disabled: z.boolean().optional()
});

const StepSchema = z.object({
    type: z.string().optional(),
    delay: z.number().optional(),
    delay_unit: z.string().optional(),
    pre_delay: z.number().optional(),
    pre_delay_unit: z.string().optional(),
    variants: z.array(VariantSchema).optional()
});

const SequenceSchema = z.object({
    steps: z.array(StepSchema).optional()
});

const ProviderRoutingRuleSchema = z.object({
    action: z.string().optional(),
    recipient_esp: z.array(z.string()).optional(),
    sender_esp: z.array(z.string()).optional()
});

const LimitEmailsPerCompanyOverrideSchema = z.object({
    mode: z.string().optional(),
    daily_limit: z.number().optional(),
    scope: z.string().optional()
});

const CampaignSchema = z.object({
    id: z.string(),
    name: z.string(),
    pl_value: z.number().nullable().optional(),
    status: z.number(),
    is_evergreen: z.boolean().nullable().optional(),
    campaign_schedule: CampaignScheduleSchema,
    sequences: z.array(SequenceSchema).optional(),
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
    auto_variant_select: z
        .object({
            trigger: z.string().optional()
        })
        .nullable()
        .optional(),
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

const action = createAction({
    description: 'Retrieve a campaign by ID.',
    version: '1.0.0',
    endpoint: { method: 'GET', path: '/actions/get-campaign' },
    input: InputSchema,
    output: CampaignSchema,
    scopes: ['campaigns:read', 'all:read'],

    exec: async (nango, input) => {
        const response = await nango.get({
            // https://developer.instantly.ai/api-reference/campaign/get-campaign
            endpoint: `/v2/campaigns/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (response.status === 404) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Campaign not found',
                id: input.id
            });
        }

        const campaign = CampaignSchema.parse(response.data);
        return campaign;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
