import type { NangoAction, ProxyConfiguration, Contact, IntercomCreateContact } from '../../models';
import { toContact } from '../mappers/to-contact.js';
import { intercomCreateContactSchema } from '../schema.zod.js';
import type { IntercomContact } from '../types';

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
export default async function runAction(nango: NangoAction, input: IntercomCreateContact): Promise<Contact> {
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
