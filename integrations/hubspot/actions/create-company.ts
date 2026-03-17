import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().optional().describe('Company name. Example: "Acme Inc."'),
    domain: z.string().optional().describe('Company domain. Example: "acme.com"'),
    city: z.string().optional().describe('Company city. Example: "San Francisco"'),
    industry: z.string().optional().describe('Company industry. Example: "Software"'),
    phone: z.string().optional().describe('Company phone number. Example: "+1-555-1234"'),
    website: z.string().optional().describe('Company website URL. Example: "https://acme.com"')
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    domain: z.string().optional(),
    city: z.string().optional(),
    industry: z.string().optional(),
    phone: z.string().optional(),
    website: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional()
});

const action = createAction({
    description: 'Create a company record',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/create-company',
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
        if (input.industry) properties['industry'] = input.industry;
        if (input.phone) properties['phone'] = input.phone;
        if (input.website) properties['website'] = input.website;

        // https://developers.hubspot.com/docs/api-reference/crm/objects/companies#create-companies
        const response = await nango.post({
            endpoint: '/crm/v3/objects/companies',
            data: { properties },
            retries: 3
        });

        const data = response.data;

        return {
            id: data.id,
            name: data.properties?.['name'] ?? undefined,
            domain: data.properties?.['domain'] ?? undefined,
            city: data.properties?.['city'] ?? undefined,
            industry: data.properties?.['industry'] ?? undefined,
            phone: data.properties?.['phone'] ?? undefined,
            website: data.properties?.['website'] ?? undefined,
            createdAt: data.createdAt ?? undefined,
            updatedAt: data.updatedAt ?? undefined
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
