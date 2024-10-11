import type { NangoAction, ProxyConfiguration, CreateUpdateCompanyOutput, UpdateCompanyInput } from '../../models';
import { UpdateCompanyInputSchema } from '../schema.js';
import { createUpdateCompany, toHubspotCompany } from '../mappers/toCompany.js';

export default async function runAction(nango: NangoAction, input: UpdateCompanyInput): Promise<CreateUpdateCompanyOutput> {
    const parsedInput = UpdateCompanyInputSchema.safeParse(input);

    if (!parsedInput.success) {
        for (const error of parsedInput.error.errors) {
            await nango.log(`Invalid input provided to update a company: ${error.message} at path ${error.path.join('.')}`, { level: 'error' });
        }
        throw new nango.ActionError({
            message: 'Invalid input provided to update a company'
        });
    }

    const hubSpotCompany = toHubspotCompany(parsedInput.data);
    const config: ProxyConfiguration = {
        endpoint: `crm/v3/objects/companies/${parsedInput.data.id}`,
        data: hubSpotCompany,
        retries: 10
    };

    //https://developers.hubspot.com/docs/api/crm/companies#update-companies
    const response = await nango.patch(config);

    return createUpdateCompany(response.data);
}
