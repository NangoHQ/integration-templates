import type { NangoAction, ProxyConfiguration, CreateUpdateContactOutput, CreateContactInput } from '../../models';
import { CreateContactInputSchema } from '../schema.js';
import { createUpdatetoContact, toHubspotContact } from '../mappers/toContact.js';

export default async function runAction(nango: NangoAction, input: CreateContactInput): Promise<CreateUpdateContactOutput> {
    const parsedInput = CreateContactInputSchema.safeParse(input);

    if (!parsedInput.success) {
        for (const error of parsedInput.error.errors) {
            await nango.log(`Invalid input provided to create a contact: ${error.message} at path ${error.path.join('.')}`, { level: 'error' });
        }
        throw new nango.ActionError({
            message: 'Invalid input provided to create a contact'
        });
    }

    const hubSpotContact = toHubspotContact(parsedInput.data);
    const config: ProxyConfiguration = {
        // https://developers.hubspot.com/docs/api/crm/contacts#create-contacts
        endpoint: 'crm/v3/objects/contacts',
        data: hubSpotContact,
        retries: 10
    };
    const response = await nango.post(config);

    return createUpdatetoContact(response.data);
}
