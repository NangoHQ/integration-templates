import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    lead_id: z.string().describe('The ID of the lead to merge. Example: "019f1a0d-70d9-756a-bc19-c8b5cc3a0215"'),
    destination_lead_id: z.string().describe('The ID of the destination lead to merge into. Example: "019f1a0d-ff98-75d7-86b0-e0f62f62a15e"')
});

const ProviderLeadSchema = z
    .object({
        id: z.string(),
        timestamp_created: z.string(),
        timestamp_updated: z.string(),
        organization: z.string(),
        status: z.number(),
        email: z.string().nullable().optional(),
        personalization: z.string().nullable().optional(),
        website: z.string().nullable().optional(),
        last_name: z.string().nullable().optional(),
        first_name: z.string().nullable().optional(),
        company_name: z.string().nullable().optional(),
        job_title: z.string().nullable().optional(),
        phone: z.string().nullable().optional(),
        email_open_count: z.number(),
        email_reply_count: z.number(),
        email_click_count: z.number(),
        company_domain: z.string(),
        status_summary: z.record(z.string(), z.unknown()).optional(),
        payload: z.record(z.string(), z.unknown()).nullable().optional(),
        status_summary_subseq: z.record(z.string(), z.unknown()).optional(),
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

const OutputSchema = z.object({
    id: z.string(),
    timestamp_created: z.string().optional(),
    timestamp_updated: z.string().optional(),
    organization: z.string().optional(),
    status: z.number().optional(),
    email: z.string().optional(),
    personalization: z.string().optional(),
    website: z.string().optional(),
    last_name: z.string().optional(),
    first_name: z.string().optional(),
    company_name: z.string().optional(),
    job_title: z.string().optional(),
    phone: z.string().optional(),
    email_open_count: z.number().optional(),
    email_reply_count: z.number().optional(),
    email_click_count: z.number().optional(),
    company_domain: z.string().optional(),
    status_summary: z.record(z.string(), z.unknown()).optional(),
    payload: z.record(z.string(), z.unknown()).optional(),
    status_summary_subseq: z.record(z.string(), z.unknown()).optional(),
    last_step_from: z.string().optional(),
    last_step_id: z.string().optional(),
    last_step_timestamp_executed: z.string().optional(),
    email_opened_step: z.number().optional(),
    email_opened_variant: z.number().optional(),
    email_replied_step: z.number().optional(),
    email_replied_variant: z.number().optional(),
    email_clicked_step: z.number().optional(),
    email_clicked_variant: z.number().optional(),
    lt_interest_status: z.number().optional(),
    subsequence_id: z.string().optional(),
    verification_status: z.number().optional(),
    pl_value_lead: z.string().optional(),
    timestamp_added_subsequence: z.string().optional(),
    timestamp_last_contact: z.string().optional(),
    timestamp_last_open: z.string().optional(),
    timestamp_last_reply: z.string().optional(),
    timestamp_last_interest_change: z.string().optional(),
    timestamp_last_click: z.string().optional(),
    enrichment_status: z.number().optional(),
    list_id: z.string().optional(),
    last_contacted_from: z.string().optional(),
    uploaded_by_user: z.string().optional(),
    upload_method: z.string().optional(),
    assigned_to: z.string().optional(),
    is_website_visitor: z.boolean().optional(),
    timestamp_last_touch: z.string().optional(),
    esp_code: z.number().optional(),
    esg_code: z.number().optional()
});

const action = createAction({
    description: 'Merge two leads',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['leads:update'],
    endpoint: {
        method: 'POST',
        path: '/actions/merge-leads'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.instantly.ai/api-reference/lead/merge-two-leads.md
            endpoint: '/v2/leads/merge',
            data: {
                lead_id: input.lead_id,
                destination_lead_id: input.destination_lead_id
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'merge_failed',
                message: 'Lead merge failed or returned empty data.'
            });
        }

        const providerLead = ProviderLeadSchema.parse(response.data);

        return {
            id: providerLead.id,
            ...(providerLead.timestamp_created !== undefined && { timestamp_created: providerLead.timestamp_created }),
            ...(providerLead.timestamp_updated !== undefined && { timestamp_updated: providerLead.timestamp_updated }),
            ...(providerLead.organization !== undefined && { organization: providerLead.organization }),
            ...(providerLead.status !== undefined && { status: providerLead.status }),
            ...(providerLead.email != null && { email: providerLead.email }),
            ...(providerLead.personalization != null && { personalization: providerLead.personalization }),
            ...(providerLead.website != null && { website: providerLead.website }),
            ...(providerLead.last_name != null && { last_name: providerLead.last_name }),
            ...(providerLead.first_name != null && { first_name: providerLead.first_name }),
            ...(providerLead.company_name != null && { company_name: providerLead.company_name }),
            ...(providerLead.job_title != null && { job_title: providerLead.job_title }),
            ...(providerLead.phone != null && { phone: providerLead.phone }),
            ...(providerLead.email_open_count !== undefined && { email_open_count: providerLead.email_open_count }),
            ...(providerLead.email_reply_count !== undefined && { email_reply_count: providerLead.email_reply_count }),
            ...(providerLead.email_click_count !== undefined && { email_click_count: providerLead.email_click_count }),
            ...(providerLead.company_domain !== undefined && { company_domain: providerLead.company_domain }),
            ...(providerLead.status_summary !== undefined && { status_summary: providerLead.status_summary }),
            ...(providerLead.payload != null && { payload: providerLead.payload }),
            ...(providerLead.status_summary_subseq !== undefined && { status_summary_subseq: providerLead.status_summary_subseq }),
            ...(providerLead.last_step_from != null && { last_step_from: providerLead.last_step_from }),
            ...(providerLead.last_step_id != null && { last_step_id: providerLead.last_step_id }),
            ...(providerLead.last_step_timestamp_executed != null && { last_step_timestamp_executed: providerLead.last_step_timestamp_executed }),
            ...(providerLead.email_opened_step != null && { email_opened_step: providerLead.email_opened_step }),
            ...(providerLead.email_opened_variant != null && { email_opened_variant: providerLead.email_opened_variant }),
            ...(providerLead.email_replied_step != null && { email_replied_step: providerLead.email_replied_step }),
            ...(providerLead.email_replied_variant != null && { email_replied_variant: providerLead.email_replied_variant }),
            ...(providerLead.email_clicked_step != null && { email_clicked_step: providerLead.email_clicked_step }),
            ...(providerLead.email_clicked_variant != null && { email_clicked_variant: providerLead.email_clicked_variant }),
            ...(providerLead.lt_interest_status !== undefined && { lt_interest_status: providerLead.lt_interest_status }),
            ...(providerLead.subsequence_id != null && { subsequence_id: providerLead.subsequence_id }),
            ...(providerLead.verification_status !== undefined && { verification_status: providerLead.verification_status }),
            ...(providerLead.pl_value_lead != null && { pl_value_lead: providerLead.pl_value_lead }),
            ...(providerLead.timestamp_added_subsequence != null && { timestamp_added_subsequence: providerLead.timestamp_added_subsequence }),
            ...(providerLead.timestamp_last_contact != null && { timestamp_last_contact: providerLead.timestamp_last_contact }),
            ...(providerLead.timestamp_last_open != null && { timestamp_last_open: providerLead.timestamp_last_open }),
            ...(providerLead.timestamp_last_reply != null && { timestamp_last_reply: providerLead.timestamp_last_reply }),
            ...(providerLead.timestamp_last_interest_change != null && { timestamp_last_interest_change: providerLead.timestamp_last_interest_change }),
            ...(providerLead.timestamp_last_click != null && { timestamp_last_click: providerLead.timestamp_last_click }),
            ...(providerLead.enrichment_status !== undefined && { enrichment_status: providerLead.enrichment_status }),
            ...(providerLead.list_id != null && { list_id: providerLead.list_id }),
            ...(providerLead.last_contacted_from != null && { last_contacted_from: providerLead.last_contacted_from }),
            ...(providerLead.uploaded_by_user != null && { uploaded_by_user: providerLead.uploaded_by_user }),
            ...(providerLead.upload_method !== undefined && { upload_method: providerLead.upload_method }),
            ...(providerLead.assigned_to != null && { assigned_to: providerLead.assigned_to }),
            ...(providerLead.is_website_visitor != null && { is_website_visitor: providerLead.is_website_visitor }),
            ...(providerLead.timestamp_last_touch != null && { timestamp_last_touch: providerLead.timestamp_last_touch }),
            ...(providerLead.esp_code !== undefined && { esp_code: providerLead.esp_code }),
            ...(providerLead.esg_code !== undefined && { esg_code: providerLead.esg_code })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
