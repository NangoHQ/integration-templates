import type { NangoAction, ProxyConfiguration, CreateUpdateContactOutput, CreateContactInput } from '../../models.js';
import { CreateContactInputSchema } from '../schema.js';
import { createUpdatetoContact, toHubspotContact } from '../mappers/toContact.js';

export default async function runAction(nango: NangoAction, input: CreateContactInput): Promise<CreateUpdateContactOutput> {
    const parsedInput = await nango.zodValidateInput({ zodSchema: CreateContactInputSchema, input });

    const hubSpotContact = toHubspotContact(parsedInput.data);
    const config: ProxyConfiguration = {
        // https://developers.hubspot.com/docs/api/crm/contacts#create-contacts
        endpoint: 'crm/v3/objects/contacts',
        data: hubSpotContact,
        retries: 3
    };
    const response = await nango.post(config);

    return createUpdatetoContact(response.data);
}
