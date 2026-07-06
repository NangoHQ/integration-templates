import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Lead ID. Example: "019f1a45-a722-7b9f-a4b8-cfad19555104"'),
    personalization: z.string().nullable().optional(),
    website: z.string().nullable().optional(),
    last_name: z.string().nullable().optional(),
    first_name: z.string().nullable().optional(),
    company_name: z.string().nullable().optional(),
    job_title: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    lt_interest_status: z.number().optional(),
    pl_value_lead: z.string().nullable().optional(),
    assigned_to: z.string().nullable().optional(),
    payload: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional()
});

const ProviderLeadSchema = z.object({
    id: z.string(),
    email: z.string().nullable().optional(),
    first_name: z.string().nullable().optional(),
    last_name: z.string().nullable().optional(),
    company_name: z.string().nullable().optional(),
    job_title: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    website: z.string().nullable().optional(),
    personalization: z.string().nullable().optional(),
    lt_interest_status: z.number().optional(),
    pl_value_lead: z.string().nullable().optional(),
    assigned_to: z.string().nullable().optional(),
    payload: z.record(z.string(), z.unknown()).nullable().optional(),
    status: z.number().optional(),
    campaign: z.string().nullable().optional(),
    list_id: z.string().nullable().optional(),
    timestamp_created: z.string().optional(),
    timestamp_updated: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    email: z.string().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    company_name: z.string().optional(),
    job_title: z.string().optional(),
    phone: z.string().optional(),
    website: z.string().optional(),
    personalization: z.string().optional(),
    lt_interest_status: z.number().optional(),
    pl_value_lead: z.string().optional(),
    assigned_to: z.string().optional(),
    payload: z.record(z.string(), z.unknown()).optional(),
    status: z.number().optional(),
    campaign: z.string().optional(),
    list_id: z.string().optional(),
    timestamp_created: z.string().optional(),
    timestamp_updated: z.string().optional()
});

const action = createAction({
    description: 'Patch lead fields.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['leads:update'],
    endpoint: {
        path: '/actions/patch-lead',
        method: 'POST'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {
            ...(input.personalization !== undefined && { personalization: input.personalization }),
            ...(input.website !== undefined && { website: input.website }),
            ...(input.last_name !== undefined && { last_name: input.last_name }),
            ...(input.first_name !== undefined && { first_name: input.first_name }),
            ...(input.company_name !== undefined && { company_name: input.company_name }),
            ...(input.job_title !== undefined && { job_title: input.job_title }),
            ...(input.phone !== undefined && { phone: input.phone }),
            ...(input.lt_interest_status !== undefined && { lt_interest_status: input.lt_interest_status }),
            ...(input.pl_value_lead !== undefined && { pl_value_lead: input.pl_value_lead }),
            ...(input.assigned_to !== undefined && { assigned_to: input.assigned_to }),
            ...(input.payload !== undefined && { custom_variables: input.payload })
        };

        const response = await nango.patch({
            // https://developer.instantly.ai/api-reference/lead/patch-lead.md
            endpoint: `/v2/leads/${encodeURIComponent(input.id)}`,
            data: body,
            retries: 3
        });

        const lead = ProviderLeadSchema.parse(response.data);

        return {
            id: lead.id,
            ...(lead.email != null && { email: lead.email }),
            ...(lead.first_name != null && { first_name: lead.first_name }),
            ...(lead.last_name != null && { last_name: lead.last_name }),
            ...(lead.company_name != null && { company_name: lead.company_name }),
            ...(lead.job_title != null && { job_title: lead.job_title }),
            ...(lead.phone != null && { phone: lead.phone }),
            ...(lead.website != null && { website: lead.website }),
            ...(lead.personalization != null && { personalization: lead.personalization }),
            ...(lead.lt_interest_status !== undefined && { lt_interest_status: lead.lt_interest_status }),
            ...(lead.pl_value_lead != null && { pl_value_lead: lead.pl_value_lead }),
            ...(lead.assigned_to != null && { assigned_to: lead.assigned_to }),
            ...(lead.payload != null && { payload: lead.payload }),
            ...(lead.status !== undefined && { status: lead.status }),
            ...(lead.campaign != null && { campaign: lead.campaign }),
            ...(lead.list_id != null && { list_id: lead.list_id }),
            ...(lead.timestamp_created !== undefined && { timestamp_created: lead.timestamp_created }),
            ...(lead.timestamp_updated !== undefined && { timestamp_updated: lead.timestamp_updated })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
