import { createAction } from 'nango';
import { CreateContactInputSchema } from '../schema.js';
import { createUpdatetoContact, toHubspotContact } from '../mappers/toContact.js';

import type { ProxyConfiguration } from 'nango';
import { CreateUpdateContactOutput, CreateContactInput } from '../models.js';

const action = createAction({
    description: 'Create a single contact in Hubspot',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/contact',
        group: 'Contacts'
    },

    input: CreateContactInput,
    output: CreateUpdateContactOutput,
    scopes: ['crm.objects.contacts.write', 'oauth'],

    exec: async (nango, input): Promise<CreateUpdateContactOutput> => {
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
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
