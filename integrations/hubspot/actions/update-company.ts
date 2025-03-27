import type { NangoAction, ProxyConfiguration, CreateUpdateCompanyOutput, UpdateCompanyInput } from '../../models';
import { UpdateCompanyInputSchema } from '../schema.js';
import { createUpdateCompany, toHubspotCompany } from '../mappers/toCompany.js';

export default async function runAction(nango: NangoAction, input: UpdateCompanyInput): Promise<CreateUpdateCompanyOutput> {
    const parsedInput = await nango.zodValidateInput({ zodSchema: UpdateCompanyInputSchema, input });

    const hubSpotCompany = toHubspotCompany(parsedInput.data);
    const config: ProxyConfiguration = {
        //https://developers.hubspot.com/docs/api/crm/companies#update-companies
        endpoint: `crm/v3/objects/companies/${parsedInput.data.id}`,
        data: hubSpotCompany,
        retries: 3
    };

    const response = await nango.patch(config);

    return createUpdateCompany(response.data);
}
