import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    limit: z.number().min(1).max(100).optional().describe('Number of items to return per page. Max 100.'),
    starting_after: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    search: z.string().optional().describe('Search by campaign name.'),
    tag_ids: z.string().optional().describe('Filter campaigns by tag ids, comma-separated.'),
    ai_sales_agent_id: z.string().optional().describe('Filter campaigns by AI Sales Agent ID.'),
    status: z.number().optional().describe('Filter campaigns by status enum value.')
});

const CampaignScheduleTimingSchema = z.object({
    from: z.string(),
    to: z.string()
});

const CampaignScheduleSchema = z.object({
    start_date: z.string().nullable().optional(),
    end_date: z.string().nullable().optional(),
    schedules: z.array(
        z.object({
            name: z.string(),
            timing: CampaignScheduleTimingSchema,
            days: z.record(z.string(), z.boolean()),
            timezone: z.string()
        })
    )
});

const CampaignSequenceVariantSchema = z.object({
    subject: z.string(),
    body: z.string(),
    v_disabled: z.boolean().optional()
});

const CampaignSequenceStepSchema = z.object({
    type: z.literal('email'),
    delay: z.number(),
    delay_unit: z.string().optional(),
    pre_delay: z.number().optional(),
    pre_delay_unit: z.string().optional(),
    variants: z.array(CampaignSequenceVariantSchema)
});

const CampaignSequenceSchema = z.object({
    steps: z.array(CampaignSequenceStepSchema)
});

const CampaignSchema = z
    .object({
        id: z.string(),
        name: z.string(),
        pl_value: z.number().nullable().optional(),
        status: z.number(),
        is_evergreen: z.boolean().nullable().optional(),
        campaign_schedule: CampaignScheduleSchema,
        sequences: z.array(CampaignSequenceSchema).optional(),
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
                trigger: z.string()
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
        limit_emails_per_company_override: z
            .object({
                mode: z.string(),
                daily_limit: z.number().optional(),
                scope: z.string().optional()
            })
            .nullable()
            .optional(),
        cc_list: z.array(z.string()).optional(),
        bcc_list: z.array(z.string()).optional(),
        organization: z.string().nullable().optional(),
        owned_by: z.string().nullable().optional(),
        ai_sdr_id: z.string().nullable().optional(),
        provider_routing_rules: z
            .array(
                z.object({
                    action: z.string(),
                    recipient_esp: z.array(z.string()),
                    sender_esp: z.array(z.string())
                })
            )
            .optional()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(CampaignSchema),
    next_starting_after: z.string().optional()
});

const action = createAction({
    description: 'List campaigns.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    endpoint: {
        path: '/actions/list-campaigns',
        method: 'GET'
    },
    scopes: ['campaigns:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.instantly.ai/api-reference/campaign/list-campaign
        const response = await nango.get({
            endpoint: '/v2/campaigns',
            params: {
                ...(input.limit !== undefined && { limit: String(input.limit) }),
                ...(input.starting_after !== undefined && { starting_after: input.starting_after }),
                ...(input.search !== undefined && { search: input.search }),
                ...(input.tag_ids !== undefined && { tag_ids: input.tag_ids }),
                ...(input.ai_sales_agent_id !== undefined && { ai_sales_agent_id: input.ai_sales_agent_id }),
                ...(input.status !== undefined && { status: String(input.status) })
            },
            retries: 3
        });

        const ListResponseSchema = z.object({
            items: z.array(z.unknown()),
            next_starting_after: z.string().optional()
        });

        const parsed = ListResponseSchema.parse(response.data);

        const items = parsed.items.map((item) => {
            return CampaignSchema.parse(item);
        });

        return {
            items,
            ...(parsed.next_starting_after !== undefined && { next_starting_after: parsed.next_starting_after })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
