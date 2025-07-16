import { createAction } from "nango";
import type { RingCentralContactRecord } from '../types.js';
import { createContactSchema } from '../schema.zod.js';

import type { ProxyConfiguration } from "nango";
import { Contact, CreateContact } from "../models.js";

/**
 * Creates a new external contact in RingCentral.
 *
 * API Documentation: https://developers.ringcentral.com/api-reference/External-Contacts/createContact
 */
const action = createAction({
    description: "Creates a new external contact in RingCentral.",
    version: "0.0.1",

    endpoint: {
        method: "POST",
        path: "/contacts",
        group: "Contacts"
    },

    input: CreateContact,
    output: Contact,
    scopes: ["Contacts"],

    exec: async (nango, input): Promise<Contact> => {
        const parsedInput = await nango.zodValidateInput({ zodSchema: createContactSchema, input });

        const config: ProxyConfiguration = {
            // https://developers.ringcentral.com/api-reference/External-Contacts/createContact
            endpoint: '/restapi/v1.0/account/~/extension/~/address-book/contact',
            retries: 3,
            data: parsedInput.data
        };

        const response = await nango.post<RingCentralContactRecord>(config);

        return {
            id: response.data.id.toString(),
            firstName: response.data.firstName,
            lastName: response.data.lastName,
            email: response.data.email,
            phoneNumbers: response.data.phoneNumbers,
            company: response.data.company,
            jobTitle: response.data.jobTitle,
            notes: response.data.notes
        };
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
