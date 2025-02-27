import type { NangoAction, ProxyConfiguration, CreateUpdateCompanyOutput, UpdateCompanyInput } from '../../models';
import { UpdateCompanyInputSchema } from '../schema.js';
import { createUpdateCompany, toHubspotCompany } from '../mappers/toCompany.js';

export default async function runAction(nango: NangoAction, input: UpdateCompanyInput): Promise<CreateUpdateCompanyOutput> {
    nango.zodValidateInput({ zodSchema: UpdateCompanyInputSchema, input });

    const response = await nango.patch(config);

    return createUpdateCompany(response.data);
}
