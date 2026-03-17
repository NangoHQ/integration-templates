import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from previous response. Omit for first page.')
});

const CompanySchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    domain: z.string().optional(),
    industry: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    phone: z.string().optional(),
    website: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(CompanySchema),
    nextCursor: z.string().optional()
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
            name: company.properties?.['name'] ?? undefined,
            domain: company.properties?.['domain'] ?? undefined,
            industry: company.properties?.['industry'] ?? undefined,
            city: company.properties?.['city'] ?? undefined,
            state: company.properties?.['state'] ?? undefined,
            country: company.properties?.['country'] ?? undefined,
            phone: company.properties?.['phone'] ?? undefined,
            website: company.properties?.['website'] ?? undefined,
            createdAt: company.properties?.['createdate'] ?? undefined,
            updatedAt: company.properties?.['hs_lastmodifieddate'] ?? undefined
        }));

        return {
            items,
            nextCursor: paging?.next?.after || undefined
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
