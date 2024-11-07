import type { NangoAction, ProxyConfiguration, SuccessResponse, EmailEntity } from '../../models';
import type { IntercomContact, IntercomDeleteContactResponse } from '../types';
import { emailEntitySchema } from '../schema.zod.js';

/**
 * Deletes an Intercom user contact.
 *
 * This function validates the input against the defined schema and constructs a request
 * to the Intercom API to delete a user contact by their ID. If the input is invalid,
 * it logs the errors and throws an ActionError.
 *
 * @param {NangoAction} nango - The Nango action context, used for logging and making API requests.
 * @param {IdEntity} input - The input data containing the ID of the user contact to be deleted
 *
 * @returns {Promise<SuccessResponse>} - A promise that resolves to a SuccessResponse object indicating the result of the deletion.
 *
 * @throws {nango.ActionError} - Throws an error if the input validation fails.
 *
 * For detailed endpoint documentation, refer to:
 * https://developers.intercom.com/docs/references/rest-api/api.intercom.io/contacts/deletecontact
 */
export default async function runAction(nango: NangoAction, input: EmailEntity): Promise<SuccessResponse> {
    const parsedInput = emailEntitySchema.safeParse(input);

    if (!parsedInput.success) {
        throw new nango.ActionError({
            message: 'Invalid input provided to delete a user'
        });
    }

    const foundUserId = await findUserByEmail(nango, parsedInput.data.email);

    if (!foundUserId) {
        throw new nango.ActionError({
            message: `No user found with email ${parsedInput.data.email}`
        });
    }

    const config: ProxyConfiguration = {
        endpoint: `/contacts/${foundUserId}`,
        retries: 10
    };

    const response = await nango.delete<IntercomDeleteContactResponse>(config);
    console.log(response.data);

    return {
        success: response.data.deleted
    };
}



/**
 * Finds an Intercom user contact by email address
 * 
 * This function searches for an Intercom contact using their email address by making
 * a paginated search request to the Intercom API. It returns the contact's ID if found,
 * or null if no matching contact exists.
 *
 * @param {NangoAction} nango - The Nango action context for making API requests
 * @param {string} email - The email address to search for
 * @returns {Promise<string | null>} The contact ID if found, null otherwise
 */
async function findUserByEmail(nango: NangoAction, email: string): Promise<string | null> {
    const queryValue = {
        "query": {
            "operator": "AND",
            "value": [
                {
                    "field": "email",
                    "operator": "=",
                    "value": email
                }
            ]
        }
    };

    const getUserConfig: ProxyConfiguration = {
        endpoint: '/contacts/search',
        paginate: {
            type: 'cursor',
            cursor_path_in_response: 'pages.next.starting_after',
            limit_name_in_request: 'per_page',
            cursor_name_in_request: 'starting_after',
            response_path: 'data',
            limit: 150
        },
        data: queryValue,
        method: 'POST',
        retries: 10
    };

    for await (const contacts of nango.paginate<IntercomContact>(getUserConfig)) {
        const matchingContact = contacts.find(contact => contact.email === email);
        if (matchingContact) {
            return matchingContact.id;
        }
    }

    return null;
}