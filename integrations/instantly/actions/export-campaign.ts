import { z } from 'zod';
import { createAction } from 'nango';

const CampaignScheduleTimingSchema = z
    .object({
        from: z.string(),
        to: z.string()
    })
    .passthrough();

const CampaignScheduleDaysSchema = z.record(z.string(), z.boolean());

const CampaignScheduleItemSchema = z
    .object({
        name: z.string(),
        timing: CampaignScheduleTimingSchema,
        days: CampaignScheduleDaysSchema,
        timezone: z.string()
    })
    .passthrough();

const CampaignScheduleSchema = z
    .object({
        start_date: z.string().nullable().optional(),
        end_date: z.string().nullable().optional(),
        schedules: z.array(CampaignScheduleItemSchema).min(1)
    })
    .passthrough();

const SequenceVariantSchema = z
    .object({
        subject: z.string(),
        body: z.string(),
        v_disabled: z.boolean().optional()
    })
    .passthrough();

const SequenceStepSchema = z
    .object({
        type: z.string(),
        delay: z.number(),
        delay_unit: z.string().optional(),
        pre_delay: z.number().optional(),
        pre_delay_unit: z.string().optional(),
        variants: z.array(SequenceVariantSchema)
    })
    .passthrough();

const SequenceSchema = z
    .object({
        steps: z.array(SequenceStepSchema)
    })
    .passthrough();

const ProviderRoutingRuleSchema = z
    .object({
        action: z.string(),
        recipient_esp: z.array(z.string()),
        sender_esp: z.array(z.string())
    })
    .passthrough();

const LimitEmailsPerCompanyOverrideSchema = z
    .object({
        mode: z.string(),
        daily_limit: z.number().optional(),
        scope: z.string().optional()
    })
    .passthrough();

const AutoVariantSelectSchema = z
    .object({
        trigger: z.string()
    })
    .passthrough();

const CampaignSchema = z
    .object({
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
        open_tracking: z.boolean(),
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
    })
    .passthrough();

const InputSchema = z.object({
    campaign_id: z.string().describe('The ID of the campaign to export. Example: "9b6f458e-6dc5-4762-83d5-a528aedd2235"')
});

const action = createAction({
    description: 'Export a campaign to JSON metadata',
    version: '1.0.0',
    endpoint: { method: 'POST', path: '/actions/export-campaign' },
    input: InputSchema,
    output: CampaignSchema,
    scopes: ['campaigns:read', 'campaigns:all', 'all:read', 'all:all'],

    exec: async (nango, input): Promise<z.infer<typeof CampaignSchema>> => {
        const response = await nango.post({
            // https://developer.instantly.ai/api-reference/campaign/export-campaign-to-json-format
            endpoint: `/v2/campaigns/${encodeURIComponent(input.campaign_id)}/export`,
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Campaign not found or invalid response',
                campaign_id: input.campaign_id
            });
        }

        const campaign = CampaignSchema.parse(response.data);
        return campaign;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
