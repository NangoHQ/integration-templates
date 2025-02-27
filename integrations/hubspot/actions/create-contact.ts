import type { NangoAction, ProxyConfiguration, CreateUpdateContactOutput, CreateContactInput } from '../../models';
import { CreateContactInputSchema } from '../schema.js';
import { createUpdatetoContact, toHubspotContact } from '../mappers/toContact.js';

export default async function runAction(nango: NangoAction, input: CreateContactInput): Promise<CreateUpdateContactOutput> {
    nango.zodValidate({ zodSchema: CreateContactInputSchema, input });
    const response = await nango.post(config);

    return createUpdatetoContact(response.data);
}
