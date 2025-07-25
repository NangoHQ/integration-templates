import type { NangoAction, ProxyConfiguration, CreateUpdateContactOutput, UpdateContactInput } from '../../models.js';
import { UpdateContactInputSchema } from '../schema.js';
import { createUpdatetoContact, toHubspotContact } from '../mappers/toContact.js';

export default async function runAction(nango: NangoAction, input: UpdateContactInput): Promise<CreateUpdateContactOutput> {
    const parsedInput = await nango.zodValidateInput({ zodSchema: UpdateContactInputSchema, input });

    const hubSpotContact = toHubspotContact(parsedInput.data);
    const endpoint = parsedInput.data.id ? `crm/v3/objects/contacts/${parsedInput.data.id}` : `crm/v3/objects/contacts/${parsedInput.data.email}`;

    const config: ProxyConfiguration = {
        // https://developers.hubspot.com/docs/api/crm/contacts#update-contacts
        endpoint,
        data: hubSpotContact,
        retries: 3,
        ...(parsedInput.data.id ? {} : { params: { idProperty: 'email' } })
    };

    const response = await nango.patch(config);

    return createUpdatetoContact(response.data);
}
