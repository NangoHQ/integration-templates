import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().optional().describe('Company name to search for'),
    domain: z.string().optional().describe('Company domain to search for'),
    city: z.string().optional().describe('Company city to search for'),
    industry: z.string().optional().describe('Company industry to search for'),
    cursor: z.string().optional().describe('Pagination cursor from previous response. Omit for first page.')
});

const CompanySchema = z.object({
    id: z.string(),
    name: z.union([z.string(), z.null()]),
    domain: z.union([z.string(), z.null()]),
    city: z.union([z.string(), z.null()]),
    industry: z.union([z.string(), z.null()]),
    created_at: z.union([z.string(), z.null()]),
    updated_at: z.union([z.string(), z.null()])
});

const OutputSchema = z.object({
    companies: z.array(CompanySchema),
    next_cursor: z.union([z.string(), z.null()])
});

const action = createAction({
    description: 'Search companies by criteria',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/search-companies',
        group: 'Companies'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['crm.objects.companies.read', 'crm.schemas.companies.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const filters: any[] = [];

        if (input.name) {
            filters.push({
                propertyName: 'name',
                operator: 'CONTAINS_TOKEN',
                value: input.name
            });
        }

        if (input.domain) {
            filters.push({
                propertyName: 'domain',
                operator: 'EQ',
                value: input.domain
            });
        }

        if (input.city) {
            filters.push({
                propertyName: 'city',
                operator: 'EQ',
                value: input.city
            });
        }

        if (input.industry) {
            filters.push({
                propertyName: 'industry',
                operator: 'EQ',
                value: input.industry
            });
        }

        const searchBody: any = {
            properties: ['name', 'domain', 'city', 'industry', 'createdate', 'hs_lastmodifieddate'],
            limit: 100
        };

        if (filters.length > 0) {
            searchBody.filterGroups = [{ filters }];
        }

        if (input.cursor) {
            searchBody.after = input.cursor;
        }

        // https://developers.hubspot.com/docs/api/crm/search
        const response = await nango.post({
            endpoint: '/crm/v3/objects/companies/search',
            data: searchBody,
            retries: 3
        });

        const data = response.data;

        const companies = (data.results || []).map((company: any) => ({
            id: company.id,
            name: company.properties?.['name'] ?? null,
            domain: company.properties?.['domain'] ?? null,
            city: company.properties?.['city'] ?? null,
            industry: company.properties?.['industry'] ?? null,
            created_at: company.properties?.['createdate'] ?? null,
            updated_at: company.properties?.['hs_lastmodifieddate'] ?? null
        }));

        return {
            companies,
            next_cursor: data.paging?.next?.after || null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
