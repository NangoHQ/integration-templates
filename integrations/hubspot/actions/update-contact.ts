import type { NangoAction, ProxyConfiguration, CreateUpdateContactOutput, UpdateContactInput } from '../../models';
import { UpdateContactInputSchema } from '../schema.js';
import { createUpdatetoContact, toHubspotContact } from '../mappers/toContact.js';

export default async function runAction(nango: NangoAction, input: UpdateContactInput): Promise<CreateUpdateContactOutput> {
    nango.zodValidateInput({ zodSchema: UpdateContactInputSchema, input });

    const response = await nango.patch(config);

    return createUpdatetoContact(response.data);
}
