import { z } from 'zod';
import { createAction } from 'nango';

const CompanyInputSchema = z.object({
    name: z.string().optional().describe('Company name. Example: "Acme Inc"'),
    domain: z.string().optional().describe('Company domain. Example: "acme.com"'),
    city: z.string().optional().describe('City. Example: "San Francisco"'),
    industry: z.string().optional().describe('Industry. Example: "Technology"')
});

const InputSchema = z.object({
    companies: z.array(CompanyInputSchema).describe('Array of companies to create')
});

const CompanyOutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    domain: z.string().optional(),
    city: z.string().optional(),
    industry: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional()
});

const OutputSchema = z.object({
    companies: z.array(CompanyOutputSchema)
});

const action = createAction({
    description: 'Create multiple companies at once',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/batch-create-companies',
        group: 'Companies'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['crm.objects.companies.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const inputs = input.companies.map((company) => {
            const properties: Record<string, string> = {};
            if (company.name) properties['name'] = company.name;
            if (company.domain) properties['domain'] = company.domain;
            if (company.city) properties['city'] = company.city;
            if (company.industry) properties['industry'] = company.industry;
            return { properties };
        });

        // https://developers.hubspot.com/docs/api/crm/companies
        const response = await nango.post({
            endpoint: '/crm/v3/objects/companies/batch/create',
            data: { inputs },
            retries: 3
        });

        const results = response.data.results || [];
        const companies = results.map((result: any) => ({
            id: result.id,
            name: result.properties?.['name'] ?? undefined,
            domain: result.properties?.['domain'] ?? undefined,
            city: result.properties?.['city'] ?? undefined,
            industry: result.properties?.['industry'] ?? undefined,
            createdAt: result.createdAt ?? undefined,
            updatedAt: result.updatedAt ?? undefined
        }));

        return { companies };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
