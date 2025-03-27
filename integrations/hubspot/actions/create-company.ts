import type { NangoAction, ProxyConfiguration, CreateUpdateCompanyOutput, CreateCompanyInput } from '../../models';
import { createUpdateCompany, toHubspotCompany } from '../mappers/toCompany.js';

export default async function runAction(nango: NangoAction, input: CreateCompanyInput): Promise<CreateUpdateCompanyOutput> {
    const hubSpotCompany = toHubspotCompany(input);
    const config: ProxyConfiguration = {
        // https://developers.hubspot.com/docs/api/crm/companies#create-companies
        endpoint: 'crm/v3/objects/companies',
        data: hubSpotCompany,
        retries: 3
    };

    const response = await nango.post(config);

    return createUpdateCompany(response.data);
}
