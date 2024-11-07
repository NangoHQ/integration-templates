import type { NangoAction, ProxyConfiguration, CreateUpdateContactOutput, UpdateContactInput } from '../../models';
import { UpdateContactInputSchema } from '../schema.js';
import { createUpdatetoContact, toHubspotContact } from '../mappers/toContact.js';

export default async function runAction(nango: NangoAction, input: UpdateContactInput): Promise<CreateUpdateContactOutput> {
    const parsedInput = UpdateContactInputSchema.safeParse(input);

    if (!parsedInput.success) {
        for (const error of parsedInput.error.errors) {
            await nango.log(`Invalid input provided to update a contact: ${error.message} at path ${error.path.join('.')}`, { level: 'error' });
        }
        throw new nango.ActionError({
            message: 'Invalid input provided to update a contact'
        });
    }

    const hubSpotContact = toHubspotContact(parsedInput.data);
    const endpoint = parsedInput.data.id ? `crm/v3/objects/contacts/${parsedInput.data.id}` : `crm/v3/objects/contacts/${parsedInput.data.email}`;

    const config: ProxyConfiguration = {
        // https://developers.hubspot.com/docs/api/crm/contacts#update-contacts
        endpoint,
        data: hubSpotContact,
        retries: 10,
        ...(parsedInput.data.id ? {} : { params: { idProperty: 'email' } })
    };

    const response = await nango.patch(config);

    return createUpdatetoContact(response.data);
}
