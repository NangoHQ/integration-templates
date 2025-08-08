import { createAction } from "nango";
import { toContact } from '../mappers/to-contact.js';
import { intercomCreateContactSchema } from '../schema.zod.js';
import type { IntercomContact } from '../types.js';

import type { ProxyConfiguration } from "nango";
import { Contact, IntercomCreateContact } from "../models.js";

/**
 * Creates an Intercom user contact.
 *
 * This function validates the input against the defined schema and constructs a request
 * to the Intercom API to create a new user contact. If the input is invalid, it logs the
 * errors and throws an ActionError.
 *
 * @param {NangoAction} nango - The Nango action context, used for logging and making API requests.
 * @param {IntercomCreateContact} input - The input data for creating a contact
 *
 * @returns {Promise<Contact>} - A promise that resolves to the created contact object.
 *
 * @throws {nango.ActionError} - Throws an error if the input validation fails.
 *
 * For detailed endpoint documentation, refer to:
 * https://developers.intercom.com/docs/references/rest-api/api.intercom.io/contacts/createcontact
 */
const action = createAction({
    description: "Creates a contact in Intercom",
    version: "2.0.0",

    endpoint: {
        method: "POST",
        path: "/contact"
    },

    input: IntercomCreateContact,
    output: Contact,

    exec: async (nango, input): Promise<Contact> => {
        const parsedInput = await nango.zodValidateInput({ zodSchema: intercomCreateContactSchema, input });

        const { firstName, lastName, ...userInput } = parsedInput.data;

        const config: ProxyConfiguration = {
            // https://developers.intercom.com/docs/references/rest-api/api.intercom.io/contacts/createcontact
            endpoint: `/contacts`,
            data: {
                ...userInput,
                role: 'user',
                name: `${firstName} ${lastName}`
            },
            retries: 3
        };

        const response = await nango.post<IntercomContact>(config);

        return toContact(response.data);
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
