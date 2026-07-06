import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Lead UUID. Example: "019f1a0d-70d9-756a-bc19-c8b5cc3a0215"'),
    subsequence_id: z.string().describe('Subsequence UUID. Example: "855651af-54db-4ad5-8cfc-ac0de0f22921"')
});

const ProviderLeadSchema = z
    .object({
        id: z.string().optional(),
        timestamp_created: z.string().optional(),
        timestamp_updated: z.string().optional(),
        organization: z.string().optional(),
        campaign: z.string().nullable().optional(),
        status: z.number().optional(),
        email: z.string().nullable().optional(),
        personalization: z.string().nullable().optional(),
        website: z.string().nullable().optional(),
        last_name: z.string().nullable().optional(),
        first_name: z.string().nullable().optional(),
        company_name: z.string().nullable().optional(),
        job_title: z.string().nullable().optional(),
        phone: z.string().nullable().optional(),
        email_open_count: z.number().optional(),
        email_reply_count: z.number().optional(),
        email_click_count: z.number().optional(),
        company_domain: z.string().optional(),
        status_summary: z.unknown().optional(),
        payload: z.unknown().nullable().optional(),
        status_summary_subseq: z.unknown().optional(),
        last_step_from: z.string().nullable().optional(),
        last_step_id: z.string().nullable().optional(),
        last_step_timestamp_executed: z.string().nullable().optional(),
        email_opened_step: z.number().nullable().optional(),
        email_opened_variant: z.number().nullable().optional(),
        email_replied_step: z.number().nullable().optional(),
        email_replied_variant: z.number().nullable().optional(),
        email_clicked_step: z.number().nullable().optional(),
        email_clicked_variant: z.number().nullable().optional(),
        lt_interest_status: z.number().optional(),
        subsequence_id: z.string().nullable().optional(),
        verification_status: z.number().optional(),
        pl_value_lead: z.string().nullable().optional(),
        timestamp_added_subsequence: z.string().nullable().optional(),
        timestamp_last_contact: z.string().nullable().optional(),
        timestamp_last_open: z.string().nullable().optional(),
        timestamp_last_reply: z.string().nullable().optional(),
        timestamp_last_interest_change: z.string().nullable().optional(),
        timestamp_last_click: z.string().nullable().optional(),
        enrichment_status: z.number().optional(),
        list_id: z.string().nullable().optional(),
        last_contacted_from: z.string().nullable().optional(),
        uploaded_by_user: z.string().nullable().optional(),
        upload_method: z.string().optional(),
        assigned_to: z.string().nullable().optional(),
        is_website_visitor: z.boolean().nullable().optional(),
        timestamp_last_touch: z.string().nullable().optional(),
        esp_code: z.number().optional(),
        esg_code: z.number().optional()
    })
    .passthrough();

const action = createAction({
    description: 'Move a lead to a subsequence.',
    version: '1.0.0',
    endpoint: { method: 'POST', path: '/actions/move-lead-to-subsequence' },
    input: InputSchema,
    output: ProviderLeadSchema,
    scopes: ['leads:update', 'leads:all', 'all:update', 'all:all'],

    exec: async (nango, input): Promise<z.infer<typeof ProviderLeadSchema>> => {
        const response = await nango.post({
            // https://developer.instantly.ai/api-reference/lead/move-a-lead-to-a-subsequence
            endpoint: '/v2/leads/subsequence/move',
            data: {
                id: input.id,
                subsequence_id: input.subsequence_id
            },
            retries: 1
        });

        const providerLead = ProviderLeadSchema.parse(response.data);

        return providerLead;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
