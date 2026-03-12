import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('HubSpot company ID. Example: "123456789"'),
    name: z.string().optional().describe('Company name'),
    domain: z.string().optional().describe('Company domain'),
    city: z.string().optional().describe('City'),
    state: z.string().optional().describe('State/Region'),
    country: z.string().optional().describe('Country'),
    industry: z.string().optional().describe('Industry'),
    phone: z.string().optional().describe('Phone number'),
    website: z.string().optional().describe('Website URL'),
    description: z.string().optional().describe('Company description')
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.union([z.string(), z.null()]),
    domain: z.union([z.string(), z.null()]),
    city: z.union([z.string(), z.null()]),
    state: z.union([z.string(), z.null()]),
    country: z.union([z.string(), z.null()]),
    industry: z.union([z.string(), z.null()]),
    phone: z.union([z.string(), z.null()]),
    website: z.union([z.string(), z.null()]),
    description: z.union([z.string(), z.null()]),
    created_at: z.union([z.string(), z.null()]),
    updated_at: z.union([z.string(), z.null()])
});

const action = createAction({
    description: 'Update a company record',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/update-company',
        group: 'Companies'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['crm.objects.companies.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const properties: Record<string, string> = {};

        if (input.name) properties['name'] = input.name;
        if (input.domain) properties['domain'] = input.domain;
        if (input.city) properties['city'] = input.city;
        if (input.state) properties['state'] = input.state;
        if (input.country) properties['country'] = input.country;
        if (input.industry) properties['industry'] = input.industry;
        if (input.phone) properties['phone'] = input.phone;
        if (input.website) properties['website'] = input.website;
        if (input.description) properties['description'] = input.description;

        // https://developers.hubspot.com/docs/api-reference/crm-companies-v3/basic/patch-crm-v3-objects-companies-companyId
        const response = await nango.patch({
            endpoint: `/crm/v3/objects/companies/${input.id}`,
            data: { properties },
            retries: 10
        });

        const data = response.data;

        return {
            id: data.id,
            name: data.properties?.['name'] ?? null,
            domain: data.properties?.['domain'] ?? null,
            city: data.properties?.['city'] ?? null,
            state: data.properties?.['state'] ?? null,
            country: data.properties?.['country'] ?? null,
            industry: data.properties?.['industry'] ?? null,
            phone: data.properties?.['phone'] ?? null,
            website: data.properties?.['website'] ?? null,
            description: data.properties?.['description'] ?? null,
            created_at: data.createdAt ?? null,
            updated_at: data.updatedAt ?? null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
