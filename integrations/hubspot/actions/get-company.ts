import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Company ID to retrieve')
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    domain: z.string().optional(),
    industry: z.string().optional(),
    phone: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional()
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
            name: data.properties?.['name'] ?? undefined,
            domain: data.properties?.['domain'] ?? undefined,
            industry: data.properties?.['industry'] ?? undefined,
            phone: data.properties?.['phone'] ?? undefined,
            city: data.properties?.['city'] ?? undefined,
            state: data.properties?.['state'] ?? undefined,
            country: data.properties?.['country'] ?? undefined,
            createdAt: data.createdAt ?? undefined,
            updatedAt: data.updatedAt ?? undefined
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
