import type { NangoSync, Company, ProxyConfiguration } from '../../models.js';
import { toCompany } from '../mappers/toCompany.js';
import type { HubSpotCompanyNonUndefined } from '../types.js';

export default async function fetchData(nango: NangoSync): Promise<void> {
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
        await nango.batchSave<Company>(mappedCompanies, 'Company');
    }
}
