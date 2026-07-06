import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Source campaign ID to clone. Example: "9b6f458e-6dc5-4762-83d5-a528aedd2235"'),
    name: z.string().optional().describe('Optional name override for the new campaign.')
});

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
    type: z.string(),
    delay: z.number(),
    delay_unit: z.string().optional(),
    pre_delay: z.number().optional(),
    pre_delay_unit: z.string().optional(),
    variants: z.array(VariantSchema)
});

const SequenceSchema = z.object({
    steps: z.array(StepSchema)
});

const OutputSchema = z
    .object({
        id: z.string(),
        name: z.string(),
        status: z.number(),
        pl_value: z.number().nullable().optional(),
        is_evergreen: z.boolean().nullable().optional(),
        campaign_schedule: CampaignScheduleSchema.nullable().optional(),
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
        auto_variant_select: z.record(z.string(), z.unknown()).nullable().optional(),
        match_lead_esp: z.boolean().nullable().optional(),
        not_sending_status: z.number().nullable().optional(),
        stop_for_company: z.boolean().nullable().optional(),
        core_variables: z.record(z.string(), z.unknown()).nullable().optional(),
        custom_variables: z.record(z.string(), z.unknown()).nullable().optional(),
        insert_unsubscribe_header: z.boolean().nullable().optional(),
        allow_risky_contacts: z.boolean().nullable().optional(),
        disable_bounce_protect: z.boolean().nullable().optional(),
        limit_emails_per_company_override: z.record(z.string(), z.unknown()).nullable().optional(),
        cc_list: z.array(z.string()).optional(),
        bcc_list: z.array(z.string()).optional(),
        organization: z.string().nullable().optional(),
        owned_by: z.string().nullable().optional(),
        ai_sdr_id: z.string().nullable().optional(),
        provider_routing_rules: z.array(z.record(z.string(), z.unknown())).optional()
    })
    .passthrough();

const action = createAction({
    description: "Create a new campaign by cloning an existing campaign's structure.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['campaigns:create', 'campaigns:all', 'all:create', 'all:all'],
    endpoint: {
        path: '/actions/create-campaign-from-export',
        method: 'POST'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.instantly.ai/api-reference/groups/campaign
            endpoint: `/v2/campaigns/${encodeURIComponent(input.id)}/from-export`,
            data: {
                ...(input.name !== undefined && { name: input.name })
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'empty_response',
                message: 'The API returned an empty response when creating the campaign from export.'
            });
        }

        const campaign = OutputSchema.parse(response.data);
        return campaign;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
