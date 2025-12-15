import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

// Input schema
const GetCompanyByDomainInput = z.object({
    domain: z.string()
        .describe('Company domain to search for. Example: "nango.dev"')
});

// Output schema
const GetCompanyByDomainOutput = z.object({
    name: z.union([z.string(), z.null()]),
    domain: z.string(),
    created_at: z.union([z.string(), z.null()])
});

const action = createAction({
    description: 'Fetch a company by domain from HubSpot',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/company/search',
        group: 'Companies'
    },

    input: GetCompanyByDomainInput,
    output: GetCompanyByDomainOutput,
    scopes: ['crm.objects.companies.read'],

    exec: async (nango, input): Promise<z.infer<typeof GetCompanyByDomainOutput>> => {
        const config: ProxyConfiguration = {
            // https://developers.hubspot.com/docs/api/crm/search
            endpoint: 'crm/v3/objects/companies/search',
            data: {
                filterGroups: [
                    {
                        filters: [
                            {
                                propertyName: 'domain',
                                operator: 'EQ',
                                value: input.domain
                            }
                        ]
                    }
                ],
                properties: ['name', 'domain', 'createdate']
            },
            retries: 3
        };

        const response = await nango.post(config);

        // Extract first result from search
        const company = response.data.results?.[0];

        if (!company) {
            throw new Error(`No company found with domain: ${input.domain}`);
        }

        return {
            name: company.properties?.name ?? null,
            domain: company.properties?.domain,
            created_at: company.createdAt ?? null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
