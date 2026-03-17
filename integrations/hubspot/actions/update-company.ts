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
    name: z.string().optional(),
    domain: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    industry: z.string().optional(),
    phone: z.string().optional(),
    website: z.string().optional(),
    description: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional()
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
            retries: 3
        });

        const data = response.data;

        return {
            id: data.id,
            name: data.properties?.['name'] ?? undefined,
            domain: data.properties?.['domain'] ?? undefined,
            city: data.properties?.['city'] ?? undefined,
            state: data.properties?.['state'] ?? undefined,
            country: data.properties?.['country'] ?? undefined,
            industry: data.properties?.['industry'] ?? undefined,
            phone: data.properties?.['phone'] ?? undefined,
            website: data.properties?.['website'] ?? undefined,
            description: data.properties?.['description'] ?? undefined,
            createdAt: data.createdAt ?? undefined,
            updatedAt: data.updatedAt ?? undefined
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
