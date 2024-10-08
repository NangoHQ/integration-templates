import type { NangoSync, ProxyConfiguration, Company } from '../../models';
import type { HubspotCompany } from '../types';

export default async function fetchData(nango: NangoSync): Promise<void> {
    const config: ProxyConfiguration = {
        // https://developers.hubspot.com/docs/api/crm/companies
        endpoint: '/crm/v3/objects/companies',
        retries: 10
    };

    for await (const rawCompanies of nango.paginate<HubspotCompany>(config)) {
        const companies = rawCompanies.map((rawCompany: HubspotCompany) => {
            return {
                id: rawCompany.id,
                createdAt: rawCompany.properties.createdate,
                updatedAt: rawCompany.properties.hs_lastmodifieddate,
                name: rawCompany.properties.name,
                domain: rawCompany.properties.domain,
                archived: rawCompany.archived
            };
        });

        await nango.batchSave<Company>(companies, 'Company');
    }
}
