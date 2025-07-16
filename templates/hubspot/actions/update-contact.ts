import { createAction } from "nango";
import { UpdateContactInputSchema } from '../schema.js';
import { createUpdatetoContact, toHubspotContact } from '../mappers/toContact.js';

import type { ProxyConfiguration } from "nango";
import { CreateUpdateContactOutput, UpdateContactInput } from "../models.js";

const action = createAction({
    description: "Updates a single contact in Hubspot",
    version: "0.0.1",

    endpoint: {
        method: "PATCH",
        path: "/contact",
        group: "Contacts"
    },

    input: UpdateContactInput,
    output: CreateUpdateContactOutput,
    scopes: ["crm.objects.contacts.write", "oauth"],

    exec: async (nango, input): Promise<CreateUpdateContactOutput> => {
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
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
