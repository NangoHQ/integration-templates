import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Company ID to retrieve')
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.union([z.string(), z.null()]),
    domain: z.union([z.string(), z.null()]),
    industry: z.union([z.string(), z.null()]),
    phone: z.union([z.string(), z.null()]),
    city: z.union([z.string(), z.null()]),
    state: z.union([z.string(), z.null()]),
    country: z.union([z.string(), z.null()]),
    created_at: z.union([z.string(), z.null()]),
    updated_at: z.union([z.string(), z.null()])
});

const action = createAction({
    description: 'Get a company by ID',
    version: '1.0.0',

    endpoint: {
        method: 'GET',
        path: '/actions/get-company',
        group: 'Companies'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['crm.objects.companies.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.hubspot.com/docs/api/crm/companies
        const response = await nango.get({
            endpoint: `/crm/v3/objects/companies/${input.id}`,
            params: {
                properties: 'name,domain,industry,phone,city,state,country'
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

        const data = response.data;

        return {
            id: data.id,
            name: data.properties?.['name'] ?? null,
            domain: data.properties?.['domain'] ?? null,
            industry: data.properties?.['industry'] ?? null,
            phone: data.properties?.['phone'] ?? null,
            city: data.properties?.['city'] ?? null,
            state: data.properties?.['state'] ?? null,
            country: data.properties?.['country'] ?? null,
            created_at: data.createdAt ?? null,
            updated_at: data.updatedAt ?? null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
