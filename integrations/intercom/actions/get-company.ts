import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The unique identifier for the company which is given by Intercom. Example: "5f4d3c1c-7b1b-4d7d-a97e-6095715c6632"')
});

const ProviderCompanySchema = z.object({
    type: z.string(),
    id: z.string(),
    name: z.string().nullish(),
    app_id: z.string().optional(),
    company_id: z.string().nullish(),
    remote_created_at: z.number().nullish(),
    created_at: z.number().optional(),
    updated_at: z.number().optional(),
    last_request_at: z.number().nullish(),
    size: z.number().nullish(),
    website: z.string().nullish(),
    industry: z.string().nullish(),
    monthly_spend: z.number().nullish(),
    session_count: z.number().optional(),
    user_count: z.number().optional(),
    custom_attributes: z.record(z.string(), z.unknown()).optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    company_id: z.string().optional(),
    remote_created_at: z.number().optional(),
    created_at: z.number().optional(),
    updated_at: z.number().optional(),
    last_request_at: z.number().optional(),
    size: z.number().optional(),
    website: z.string().optional(),
    industry: z.string().optional(),
    monthly_spend: z.number().optional(),
    session_count: z.number().optional(),
    user_count: z.number().optional(),
    custom_attributes: z.record(z.string(), z.unknown()).optional()
});

const action = createAction({
    description: 'Retrieve a company by ID.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-company',
        group: 'Companies'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.intercom.com/docs/references/rest-api/api.intercom.io/companies/retrieveacompanybyid
        const response = await nango.get({
            endpoint: `/companies/${encodeURIComponent(input.id)}`,
            headers: {
                'Intercom-Version': '2.11'
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Company not found',
                id: input.id
            });
        }

        const company = ProviderCompanySchema.parse(response.data);

        return {
            id: company.id,
            ...(company.name != null && { name: company.name }),
            ...(company.company_id != null && { company_id: company.company_id }),
            ...(company.remote_created_at != null && { remote_created_at: company.remote_created_at }),
            ...(company.created_at !== undefined && { created_at: company.created_at }),
            ...(company.updated_at !== undefined && { updated_at: company.updated_at }),
            ...(company.last_request_at != null && { last_request_at: company.last_request_at }),
            ...(company.size != null && { size: company.size }),
            ...(company.website != null && { website: company.website }),
            ...(company.industry != null && { industry: company.industry }),
            ...(company.monthly_spend != null && { monthly_spend: company.monthly_spend }),
            ...(company.session_count !== undefined && { session_count: company.session_count }),
            ...(company.user_count !== undefined && { user_count: company.user_count }),
            ...(company.custom_attributes !== undefined && { custom_attributes: company.custom_attributes })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
