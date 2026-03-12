import { z } from 'zod';
import { createAction } from 'nango';

// Single company update input
const CompanyUpdateSchema = z.object({
    id: z.string().describe('The HubSpot company ID. Example: "123456789"'),
    name: z.string().optional().describe('The company name.'),
    domain: z.string().optional().describe('The company domain.'),
    industry: z.string().optional().describe('The industry the company operates in.'),
    city: z.string().optional().describe('The city where the company is located.'),
    state: z.string().optional().describe('The state where the company is located.'),
    country: z.string().optional().describe('The country where the company is located.'),
    phone: z.string().optional().describe('The company phone number.'),
    website: z.string().optional().describe('The company website URL.')
});

const InputSchema = z.object({
    companies: z.array(CompanyUpdateSchema).min(1).max(100).describe('Array of companies to update (max 100 per request).')
});

// Single company update result
const CompanyResultSchema = z.object({
    id: z.string(),
    name: z.union([z.string(), z.null()]),
    domain: z.union([z.string(), z.null()]),
    industry: z.union([z.string(), z.null()]),
    city: z.union([z.string(), z.null()]),
    state: z.union([z.string(), z.null()]),
    country: z.union([z.string(), z.null()]),
    phone: z.union([z.string(), z.null()]),
    website: z.union([z.string(), z.null()]),
    created_at: z.union([z.string(), z.null()]),
    updated_at: z.union([z.string(), z.null()])
});

const OutputSchema = z.object({
    results: z.array(CompanyResultSchema),
    status: z.string()
});

const action = createAction({
    description: 'Update multiple companies at once',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/batch-update-companies',
        group: 'Companies'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['crm.objects.companies.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // Build the inputs array for HubSpot API
        const inputs = input.companies.map((company) => {
            const properties: Record<string, string> = {};

            if (company.name) properties['name'] = company.name;
            if (company.domain) properties['domain'] = company.domain;
            if (company.industry) properties['industry'] = company.industry;
            if (company.city) properties['city'] = company.city;
            if (company.state) properties['state'] = company.state;
            if (company.country) properties['country'] = company.country;
            if (company.phone) properties['phone'] = company.phone;
            if (company.website) properties['website'] = company.website;

            return {
                id: company.id,
                properties
            };
        });

        // https://developers.hubspot.com/docs/api-reference/crm-companies-v3/batch/post-crm-v3-objects-companies-batch-update
        const response = await nango.post({
            endpoint: '/crm/v3/objects/companies/batch/update',
            data: { inputs },
            retries: 10
        });

        const data = response.data;

        // Map the results
        const results =
            data.results?.map((result: any) => ({
                id: result.id,
                name: result.properties?.['name'] ?? null,
                domain: result.properties?.['domain'] ?? null,
                industry: result.properties?.['industry'] ?? null,
                city: result.properties?.['city'] ?? null,
                state: result.properties?.['state'] ?? null,
                country: result.properties?.['country'] ?? null,
                phone: result.properties?.['phone'] ?? null,
                website: result.properties?.['website'] ?? null,
                created_at: result.createdAt ?? null,
                updated_at: result.updatedAt ?? null
            })) || [];

        return {
            results,
            status: data.status || 'COMPLETE'
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
