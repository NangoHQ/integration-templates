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
    name: z.string().optional(),
    domain: z.string().optional(),
    city: z.string().optional(),
    industry: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional()
});

const OutputSchema = z.object({
    companies: z.array(CompanySchema),
    nextCursor: z.string().optional()
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
            name: company.properties?.['name'] ?? undefined,
            domain: company.properties?.['domain'] ?? undefined,
            city: company.properties?.['city'] ?? undefined,
            industry: company.properties?.['industry'] ?? undefined,
            createdAt: company.properties?.['createdate'] ?? undefined,
            updatedAt: company.properties?.['hs_lastmodifieddate'] ?? undefined
        }));

        return {
            companies,
            nextCursor: data.paging?.next?.after || undefined
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
