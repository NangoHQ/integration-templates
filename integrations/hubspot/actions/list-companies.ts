import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from previous response. Omit for first page.')
});

const CompanySchema = z.object({
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
    items: z.array(CompanySchema),
    next_cursor: z.union([z.string(), z.null()])
});

const action = createAction({
    description: 'List company records',
    version: '1.0.0',

    endpoint: {
        method: 'GET',
        path: '/actions/list-companies',
        group: 'Companies'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['crm.objects.companies.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.hubspot.com/docs/api/crm/companies
        const response = await nango.get({
            endpoint: '/crm/v3/objects/companies',
            params: {
                properties: 'name,domain,industry,city,state,country,phone,website,createdate,hs_lastmodifieddate',
                limit: '100',
                ...(input.cursor && { after: input.cursor })
            },
            retries: 3
        });

        const companies = response.data.results || [];
        const paging = response.data.paging;

        const items = companies.map((company: any) => ({
            id: company.id,
            name: company.properties?.['name'] ?? null,
            domain: company.properties?.['domain'] ?? null,
            industry: company.properties?.['industry'] ?? null,
            city: company.properties?.['city'] ?? null,
            state: company.properties?.['state'] ?? null,
            country: company.properties?.['country'] ?? null,
            phone: company.properties?.['phone'] ?? null,
            website: company.properties?.['website'] ?? null,
            created_at: company.properties?.['createdate'] ?? null,
            updated_at: company.properties?.['hs_lastmodifieddate'] ?? null
        }));

        return {
            items,
            next_cursor: paging?.next?.after || null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
