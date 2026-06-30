import { z } from 'zod';
import { createAction } from 'nango';

const LeadInputSchema = z.object({
    email: z.string().nullable().optional().describe('Email address of the lead'),
    first_name: z.string().nullable().optional().describe('First name of the lead'),
    last_name: z.string().nullable().optional().describe('Last name of the lead'),
    company_name: z.string().nullable().optional().describe('Company name of the lead'),
    job_title: z.string().nullable().optional().describe('Job title of the lead'),
    phone: z.string().nullable().optional().describe('Phone number of the lead'),
    website: z.string().nullable().optional().describe('Website of the lead'),
    personalization: z.string().nullable().optional().describe('Personalization of the lead'),
    lt_interest_status: z.number().optional().describe('Lead interest status'),
    pl_value_lead: z.string().nullable().optional().describe('Potential value of the lead'),
    assigned_to: z.string().nullable().optional().describe('ID of the user assigned to the lead'),
    custom_variables: z.record(z.string(), z.unknown()).optional().describe('Custom variables for the lead')
});

const InputSchema = z.object({
    campaign_id: z.string().describe('The unique identifier for the campaign to add leads to. Example: "019f1a45-a728-7d40-9901-742d3ad2fddf"'),
    leads: z.array(LeadInputSchema).min(1).max(1000).describe('An array of lead objects to create. Must contain at least 1 and at most 1000 leads.'),
    blocklist_id: z.string().nullable().optional().describe('Optional blocklist ID to check leads against.'),
    assigned_to: z.string().optional().describe('Optional user ID to assign all imported leads to.'),
    verify_leads_on_import: z.boolean().optional().describe('If true, a background job will be created to verify the email addresses of the imported leads.'),
    skip_if_in_workspace: z.boolean().optional().describe('If true, any lead that already exists anywhere in your workspace will be skipped.'),
    skip_if_in_campaign: z.boolean().optional().describe('If true, any lead that already exists in ANY campaign in your workspace will be skipped.'),
    skip_if_in_list: z.boolean().optional().describe('If true, any lead that already exists in ANY list in your workspace will be skipped.')
});

const CreatedLeadSchema = z.object({
    id: z.string(),
    index: z.number(),
    email: z.string().nullable().optional(),
    first_name: z.string().nullable().optional(),
    last_name: z.string().nullable().optional(),
    phone: z.string().nullable().optional()
});

const ProviderResponseSchema = z.object({
    status: z.string(),
    total_sent: z.number(),
    leads_uploaded: z.number(),
    in_blocklist: z.number(),
    blocklist_used: z.string().nullable().optional(),
    duplicated_leads: z.number(),
    skipped_count: z.number(),
    invalid_email_count: z.number(),
    incomplete_count: z.number(),
    duplicate_email_count: z.number(),
    remaining_in_plan: z.number().nullable().optional(),
    created_leads: z.array(CreatedLeadSchema)
});

const OutputSchema = z.object({
    status: z.string(),
    total_sent: z.number(),
    leads_uploaded: z.number(),
    in_blocklist: z.number(),
    blocklist_used: z.string().optional(),
    duplicated_leads: z.number(),
    skipped_count: z.number(),
    invalid_email_count: z.number(),
    incomplete_count: z.number(),
    duplicate_email_count: z.number(),
    remaining_in_plan: z.number().optional(),
    created_leads: z.array(CreatedLeadSchema)
});

const action = createAction({
    description: 'Add leads in bulk to a campaign',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['leads:create'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.instantly.ai/api-reference/lead/add-leads-in-bulk-to-a-campaign-or-list
            endpoint: '/v2/leads/add',
            data: {
                campaign_id: input.campaign_id,
                leads: input.leads.map((lead) => ({
                    ...(lead.email !== undefined && { email: lead.email }),
                    ...(lead.first_name !== undefined && { first_name: lead.first_name }),
                    ...(lead.last_name !== undefined && { last_name: lead.last_name }),
                    ...(lead.company_name !== undefined && { company_name: lead.company_name }),
                    ...(lead.job_title !== undefined && { job_title: lead.job_title }),
                    ...(lead.phone !== undefined && { phone: lead.phone }),
                    ...(lead.website !== undefined && { website: lead.website }),
                    ...(lead.personalization !== undefined && { personalization: lead.personalization }),
                    ...(lead.lt_interest_status !== undefined && { lt_interest_status: lead.lt_interest_status }),
                    ...(lead.pl_value_lead !== undefined && { pl_value_lead: lead.pl_value_lead }),
                    ...(lead.assigned_to !== undefined && { assigned_to: lead.assigned_to }),
                    ...(lead.custom_variables !== undefined && { custom_variables: lead.custom_variables })
                })),
                ...(input.blocklist_id !== undefined && { blocklist_id: input.blocklist_id }),
                ...(input.assigned_to !== undefined && { assigned_to: input.assigned_to }),
                ...(input.verify_leads_on_import !== undefined && { verify_leads_on_import: input.verify_leads_on_import }),
                ...(input.skip_if_in_workspace !== undefined && { skip_if_in_workspace: input.skip_if_in_workspace }),
                ...(input.skip_if_in_campaign !== undefined && { skip_if_in_campaign: input.skip_if_in_campaign }),
                ...(input.skip_if_in_list !== undefined && { skip_if_in_list: input.skip_if_in_list })
            },
            retries: 3
        });

        const result = ProviderResponseSchema.parse(response.data);

        return {
            status: result.status,
            total_sent: result.total_sent,
            leads_uploaded: result.leads_uploaded,
            in_blocklist: result.in_blocklist,
            ...(result.blocklist_used != null && { blocklist_used: result.blocklist_used }),
            duplicated_leads: result.duplicated_leads,
            skipped_count: result.skipped_count,
            invalid_email_count: result.invalid_email_count,
            incomplete_count: result.incomplete_count,
            duplicate_email_count: result.duplicate_email_count,
            ...(result.remaining_in_plan != null && { remaining_in_plan: result.remaining_in_plan }),
            created_leads: result.created_leads.map((lead) => ({
                id: lead.id,
                index: lead.index,
                ...(lead.email != null && { email: lead.email }),
                ...(lead.first_name != null && { first_name: lead.first_name }),
                ...(lead.last_name != null && { last_name: lead.last_name }),
                ...(lead.phone != null && { phone: lead.phone })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
