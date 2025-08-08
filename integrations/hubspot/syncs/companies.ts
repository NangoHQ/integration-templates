import { createSync } from 'nango';
import { toCompany } from '../mappers/toCompany.js';
import type { HubSpotCompanyNonUndefined } from '../types.js';

import type { ProxyConfiguration } from 'nango';
import { Company } from '../models.js';
import { z } from 'zod';

const sync = createSync({
    description: 'Fetches a list of companies from Hubspot',
    version: '2.0.0',
    frequency: 'every day',
    autoStart: true,
    syncType: 'full',
    trackDeletes: true,

    endpoints: [
        {
            method: 'GET',
            path: '/companies',
            group: 'Companies'
        }
    ],

    scopes: ['crm.objects.companies.read', 'oauth'],

    models: {
        Company: Company
    },

    metadata: z.object({}),

    exec: async (nango) => {
        const properties = [
            'name',
            'industry',
            'description',
            'country',
            'city',
            'createdAt',
            'hs_lead_status',
            'lifecyclestage',
            'hubspot_owner_id',
            'founded_year',
            'website'
        ];
        const config: ProxyConfiguration = {
            //https://developers.hubspot.com/docs/api/crm/companies#retrieve-companies
            endpoint: '/crm/v3/objects/companies',
            params: {
                properties: properties.join(',')
            },
            paginate: {
                type: 'cursor',
                cursor_path_in_response: 'paging.next.after',
                limit_name_in_request: 'limit',
                cursor_name_in_request: 'after',
                response_path: 'results',
                limit: 100
            },
            retries: 10
        };
        for await (const contacts of nango.paginate<HubSpotCompanyNonUndefined>(config)) {
            const mappedCompanies = contacts.map((company: HubSpotCompanyNonUndefined) => toCompany(company));
            await nango.batchSave(mappedCompanies, 'Company');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
