import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Lead ID. Example: "019f1a0d-70d9-756a-bc19-c8b5cc3a0215"')
});

const PayloadSchema = z
    .object({
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        companyName: z.string().optional(),
        jobTitle: z.string().optional(),
        website: z.string().optional(),
        phone: z.string().optional(),
        personalization: z.string().optional()
    })
    .passthrough();

const StatusSummarySchema = z.object({
    lastStep: z
        .object({
            from: z.string().optional(),
            stepID: z.string().optional(),
            timestamp_executed: z.string().optional()
        })
        .optional(),
    domain_complete: z.boolean().optional()
});

const StatusSummarySubseqSchema = z.object({
    from: z.string().optional(),
    stepID: z.string().optional(),
    timestampExecuted: z.string().optional()
});

const ProviderLeadSchema = z.object({
    id: z.string(),
    timestamp_created: z.string(),
    timestamp_updated: z.string(),
    organization: z.string(),
    campaign: z.string().nullable().optional(),
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
    status_summary: StatusSummarySchema,
    status_summary_subseq: StatusSummarySubseqSchema.optional(),
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
    esg_code: z.number().optional(),
    payload: PayloadSchema.nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    timestamp_created: z.string(),
    timestamp_updated: z.string(),
    organization: z.string(),
    campaign: z.string().optional(),
    status: z.number(),
    email: z.string().optional(),
    personalization: z.string().optional(),
    website: z.string().optional(),
    last_name: z.string().optional(),
    first_name: z.string().optional(),
    company_name: z.string().optional(),
    job_title: z.string().optional(),
    phone: z.string().optional(),
    email_open_count: z.number(),
    email_reply_count: z.number(),
    email_click_count: z.number(),
    company_domain: z.string(),
    status_summary: StatusSummarySchema,
    status_summary_subseq: StatusSummarySubseqSchema.optional(),
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
    esg_code: z.number().optional(),
    payload: PayloadSchema.optional()
});

const action = createAction({
    description: 'Retrieve a lead by ID.',
    version: '1.0.0',
    endpoint: {
        path: '/actions/get-lead',
        method: 'GET'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['leads:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developer.instantly.ai/api-reference/lead/get-lead
            endpoint: `/v2/leads/${encodeURIComponent(input.id)}`,
            retries: 3
        };
        const response = await nango.get(config);

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Lead not found',
                id: input.id
            });
        }

        const providerLead = ProviderLeadSchema.parse(response.data);

        return {
            id: providerLead.id,
            timestamp_created: providerLead.timestamp_created,
            timestamp_updated: providerLead.timestamp_updated,
            organization: providerLead.organization,
            status: providerLead.status,
            email_open_count: providerLead.email_open_count,
            email_reply_count: providerLead.email_reply_count,
            email_click_count: providerLead.email_click_count,
            company_domain: providerLead.company_domain,
            status_summary: providerLead.status_summary,
            ...(providerLead.campaign != null && { campaign: providerLead.campaign }),
            ...(providerLead.email != null && { email: providerLead.email }),
            ...(providerLead.personalization != null && { personalization: providerLead.personalization }),
            ...(providerLead.website != null && { website: providerLead.website }),
            ...(providerLead.last_name != null && { last_name: providerLead.last_name }),
            ...(providerLead.first_name != null && { first_name: providerLead.first_name }),
            ...(providerLead.company_name != null && { company_name: providerLead.company_name }),
            ...(providerLead.job_title != null && { job_title: providerLead.job_title }),
            ...(providerLead.phone != null && { phone: providerLead.phone }),
            ...(providerLead.status_summary_subseq != null && { status_summary_subseq: providerLead.status_summary_subseq }),
            ...(providerLead.last_step_from != null && { last_step_from: providerLead.last_step_from }),
            ...(providerLead.last_step_id != null && { last_step_id: providerLead.last_step_id }),
            ...(providerLead.last_step_timestamp_executed != null && { last_step_timestamp_executed: providerLead.last_step_timestamp_executed }),
            ...(providerLead.email_opened_step != null && { email_opened_step: providerLead.email_opened_step }),
            ...(providerLead.email_opened_variant != null && { email_opened_variant: providerLead.email_opened_variant }),
            ...(providerLead.email_replied_step != null && { email_replied_step: providerLead.email_replied_step }),
            ...(providerLead.email_replied_variant != null && { email_replied_variant: providerLead.email_replied_variant }),
            ...(providerLead.email_clicked_step != null && { email_clicked_step: providerLead.email_clicked_step }),
            ...(providerLead.email_clicked_variant != null && { email_clicked_variant: providerLead.email_clicked_variant }),
            ...(providerLead.lt_interest_status != null && { lt_interest_status: providerLead.lt_interest_status }),
            ...(providerLead.subsequence_id != null && { subsequence_id: providerLead.subsequence_id }),
            ...(providerLead.verification_status != null && { verification_status: providerLead.verification_status }),
            ...(providerLead.pl_value_lead != null && { pl_value_lead: providerLead.pl_value_lead }),
            ...(providerLead.timestamp_added_subsequence != null && { timestamp_added_subsequence: providerLead.timestamp_added_subsequence }),
            ...(providerLead.timestamp_last_contact != null && { timestamp_last_contact: providerLead.timestamp_last_contact }),
            ...(providerLead.timestamp_last_open != null && { timestamp_last_open: providerLead.timestamp_last_open }),
            ...(providerLead.timestamp_last_reply != null && { timestamp_last_reply: providerLead.timestamp_last_reply }),
            ...(providerLead.timestamp_last_interest_change != null && { timestamp_last_interest_change: providerLead.timestamp_last_interest_change }),
            ...(providerLead.timestamp_last_click != null && { timestamp_last_click: providerLead.timestamp_last_click }),
            ...(providerLead.enrichment_status != null && { enrichment_status: providerLead.enrichment_status }),
            ...(providerLead.list_id != null && { list_id: providerLead.list_id }),
            ...(providerLead.last_contacted_from != null && { last_contacted_from: providerLead.last_contacted_from }),
            ...(providerLead.uploaded_by_user != null && { uploaded_by_user: providerLead.uploaded_by_user }),
            ...(providerLead.upload_method != null && { upload_method: providerLead.upload_method }),
            ...(providerLead.assigned_to != null && { assigned_to: providerLead.assigned_to }),
            ...(providerLead.is_website_visitor != null && { is_website_visitor: providerLead.is_website_visitor }),
            ...(providerLead.timestamp_last_touch != null && { timestamp_last_touch: providerLead.timestamp_last_touch }),
            ...(providerLead.esp_code != null && { esp_code: providerLead.esp_code }),
            ...(providerLead.esg_code != null && { esg_code: providerLead.esg_code }),
            ...(providerLead.payload != null && { payload: providerLead.payload })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
