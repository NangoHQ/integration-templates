import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    email: z.string().describe('Email address of the lead. Example: "example@example.com"'),
    first_name: z.string().optional().describe('First name of the lead. Example: "John"'),
    last_name: z.string().optional().describe('Last name of the lead. Example: "Doe"'),
    company_name: z.string().optional().describe('Company name of the lead. Example: "Example Inc."'),
    list_id: z.string().optional().describe('List ID associated with the lead. Example: "019f1a45-4dfb-7da4-b68b-0eaf57f6b3a6"'),
    payload: z
        .record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]))
        .optional()
        .describe('Custom fields map for the lead. Values can be string, number, boolean, or null.')
});

const ProviderStatusSummarySchema = z.object({
    lastStep: z
        .object({
            from: z.string().optional(),
            stepID: z.string().optional(),
            timestamp_executed: z.string().optional()
        })
        .optional(),
    domain_complete: z.boolean().optional()
});

const ProviderLeadSchema = z.object({
    id: z.string(),
    timestamp_created: z.string(),
    timestamp_updated: z.string(),
    organization: z.string(),
    status: z.number(),
    email_open_count: z.number(),
    email_reply_count: z.number(),
    email_click_count: z.number(),
    company_domain: z.string(),
    status_summary: ProviderStatusSummarySchema,
    campaign: z.string().nullish(),
    email: z.string().nullish(),
    personalization: z.string().nullish(),
    website: z.string().nullish(),
    last_name: z.string().nullish(),
    first_name: z.string().nullish(),
    company_name: z.string().nullish(),
    job_title: z.string().nullish(),
    phone: z.string().nullish(),
    status_summary_subseq: z
        .object({
            from: z.string().optional(),
            stepID: z.string().optional(),
            timestampExecuted: z.string().optional()
        })
        .nullish(),
    last_step_from: z.string().nullish(),
    last_step_id: z.string().nullish(),
    last_step_timestamp_executed: z.string().nullish(),
    email_opened_step: z.number().nullish(),
    email_opened_variant: z.number().nullish(),
    email_replied_step: z.number().nullish(),
    email_replied_variant: z.number().nullish(),
    email_clicked_step: z.number().nullish(),
    email_clicked_variant: z.number().nullish(),
    lt_interest_status: z.number().optional(),
    subsequence_id: z.string().nullish(),
    verification_status: z.number().optional(),
    pl_value_lead: z.string().nullish(),
    timestamp_added_subsequence: z.string().nullish(),
    timestamp_last_contact: z.string().nullish(),
    timestamp_last_open: z.string().nullish(),
    timestamp_last_reply: z.string().nullish(),
    timestamp_last_interest_change: z.string().nullish(),
    timestamp_last_click: z.string().nullish(),
    enrichment_status: z.number().optional(),
    list_id: z.string().nullish(),
    last_contacted_from: z.string().nullish(),
    uploaded_by_user: z.string().nullish(),
    upload_method: z.string().optional(),
    assigned_to: z.string().nullish(),
    is_website_visitor: z.boolean().nullish(),
    timestamp_last_touch: z.string().nullish(),
    esp_code: z.number().optional(),
    esg_code: z.number().optional(),
    payload: z.record(z.string(), z.unknown()).nullish()
});

const OutputSchema = z.object({
    id: z.string(),
    timestamp_created: z.string(),
    timestamp_updated: z.string(),
    organization: z.string(),
    status: z.number(),
    email_open_count: z.number(),
    email_reply_count: z.number(),
    email_click_count: z.number(),
    company_domain: z.string(),
    status_summary: ProviderStatusSummarySchema.optional(),
    campaign: z.string().optional(),
    email: z.string().optional(),
    personalization: z.string().optional(),
    website: z.string().optional(),
    last_name: z.string().optional(),
    first_name: z.string().optional(),
    company_name: z.string().optional(),
    job_title: z.string().optional(),
    phone: z.string().optional(),
    status_summary_subseq: z
        .object({
            from: z.string().optional(),
            stepID: z.string().optional(),
            timestampExecuted: z.string().optional()
        })
        .optional(),
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
    payload: z.record(z.string(), z.unknown()).optional()
});

function omitNull<T>(value: T | null | undefined): T | undefined {
    if (value === null || value === undefined) {
        return undefined;
    }
    return value;
}

const action = createAction({
    description: 'Create a single lead.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['leads:create'],
    endpoint: {
        path: '/actions/create-lead',
        method: 'POST'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.instantly.ai/api-reference/lead/create-lead
            endpoint: '/v2/leads',
            data: {
                email: input.email,
                ...(input.first_name !== undefined && { first_name: input.first_name }),
                ...(input.last_name !== undefined && { last_name: input.last_name }),
                ...(input.company_name !== undefined && { company_name: input.company_name }),
                ...(input.list_id !== undefined && { list_id: input.list_id }),
                ...(input.payload !== undefined && { custom_variables: input.payload })
            },
            retries: 10
        });

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
            campaign: omitNull(providerLead.campaign),
            email: omitNull(providerLead.email),
            personalization: omitNull(providerLead.personalization),
            website: omitNull(providerLead.website),
            last_name: omitNull(providerLead.last_name),
            first_name: omitNull(providerLead.first_name),
            company_name: omitNull(providerLead.company_name),
            job_title: omitNull(providerLead.job_title),
            phone: omitNull(providerLead.phone),
            status_summary_subseq: omitNull(providerLead.status_summary_subseq),
            last_step_from: omitNull(providerLead.last_step_from),
            last_step_id: omitNull(providerLead.last_step_id),
            last_step_timestamp_executed: omitNull(providerLead.last_step_timestamp_executed),
            email_opened_step: omitNull(providerLead.email_opened_step),
            email_opened_variant: omitNull(providerLead.email_opened_variant),
            email_replied_step: omitNull(providerLead.email_replied_step),
            email_replied_variant: omitNull(providerLead.email_replied_variant),
            email_clicked_step: omitNull(providerLead.email_clicked_step),
            email_clicked_variant: omitNull(providerLead.email_clicked_variant),
            lt_interest_status: providerLead.lt_interest_status,
            subsequence_id: omitNull(providerLead.subsequence_id),
            verification_status: providerLead.verification_status,
            pl_value_lead: omitNull(providerLead.pl_value_lead),
            timestamp_added_subsequence: omitNull(providerLead.timestamp_added_subsequence),
            timestamp_last_contact: omitNull(providerLead.timestamp_last_contact),
            timestamp_last_open: omitNull(providerLead.timestamp_last_open),
            timestamp_last_reply: omitNull(providerLead.timestamp_last_reply),
            timestamp_last_interest_change: omitNull(providerLead.timestamp_last_interest_change),
            timestamp_last_click: omitNull(providerLead.timestamp_last_click),
            enrichment_status: providerLead.enrichment_status,
            list_id: omitNull(providerLead.list_id),
            last_contacted_from: omitNull(providerLead.last_contacted_from),
            uploaded_by_user: omitNull(providerLead.uploaded_by_user),
            upload_method: providerLead.upload_method,
            assigned_to: omitNull(providerLead.assigned_to),
            is_website_visitor: omitNull(providerLead.is_website_visitor),
            timestamp_last_touch: omitNull(providerLead.timestamp_last_touch),
            esp_code: providerLead.esp_code,
            esg_code: providerLead.esg_code,
            payload: omitNull(providerLead.payload)
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
