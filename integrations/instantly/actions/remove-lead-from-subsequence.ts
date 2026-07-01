import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Lead UUID. Example: "019f1a0d-70d9-756a-bc19-c8b5cc3a0215"')
});

const ProviderLeadSchema = z
    .object({
        id: z.string(),
        timestamp_created: z.string().nullable().optional(),
        timestamp_updated: z.string().nullable().optional(),
        organization: z.string().nullable().optional(),
        campaign: z.string().nullable().optional(),
        status: z.number().nullable().optional(),
        email: z.string().nullable().optional(),
        first_name: z.string().nullable().optional(),
        last_name: z.string().nullable().optional(),
        company_name: z.string().nullable().optional(),
        job_title: z.string().nullable().optional(),
        phone: z.string().nullable().optional(),
        company_domain: z.string().nullable().optional(),
        list_id: z.string().nullable().optional(),
        subsequence_id: z.string().nullable().optional(),
        verification_status: z.number().nullable().optional(),
        upload_method: z.string().nullable().optional(),
        assigned_to: z.string().nullable().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string(),
    timestamp_created: z.string().optional(),
    timestamp_updated: z.string().optional(),
    organization: z.string().optional(),
    campaign: z.string().optional(),
    status: z.number().optional(),
    email: z.string().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    company_name: z.string().optional(),
    job_title: z.string().optional(),
    phone: z.string().optional(),
    company_domain: z.string().optional(),
    list_id: z.string().optional(),
    subsequence_id: z.string().optional(),
    verification_status: z.number().optional(),
    upload_method: z.string().optional(),
    assigned_to: z.string().optional()
});

const action = createAction({
    description: 'Remove a lead from a subsequence.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.instantly.ai/api-reference/groups/lead
            endpoint: '/v2/leads/subsequence/remove',
            data: {
                id: input.id
            },
            retries: 3
        });

        const lead = ProviderLeadSchema.parse(response.data);

        return {
            id: lead.id,
            ...(lead.timestamp_created != null && { timestamp_created: lead.timestamp_created }),
            ...(lead.timestamp_updated != null && { timestamp_updated: lead.timestamp_updated }),
            ...(lead.organization != null && { organization: lead.organization }),
            ...(lead.campaign != null && { campaign: lead.campaign }),
            ...(lead.status != null && { status: lead.status }),
            ...(lead.email != null && { email: lead.email }),
            ...(lead.first_name != null && { first_name: lead.first_name }),
            ...(lead.last_name != null && { last_name: lead.last_name }),
            ...(lead.company_name != null && { company_name: lead.company_name }),
            ...(lead.job_title != null && { job_title: lead.job_title }),
            ...(lead.phone != null && { phone: lead.phone }),
            ...(lead.company_domain != null && { company_domain: lead.company_domain }),
            ...(lead.list_id != null && { list_id: lead.list_id }),
            ...(lead.subsequence_id != null && { subsequence_id: lead.subsequence_id }),
            ...(lead.verification_status != null && { verification_status: lead.verification_status }),
            ...(lead.upload_method != null && { upload_method: lead.upload_method }),
            ...(lead.assigned_to != null && { assigned_to: lead.assigned_to })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
