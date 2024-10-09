import type { NangoAction, Contact, CreateContact } from '../../models';
import { createContactSchema } from '../schema.zod.js';
import type { HubspotContactResponse } from '../types';

/**
 * Executes an action to create a contact based on the provided input.
 * It validates the input against the defined schema, logs any validation errors,
 * and then sends a POST request to create a contact if the input is valid.
 * @param nango - An instance of NangoAction used for logging and making API requests.
 * @param input - The input data required to create a contact.
 * @returns A promise that resolves to the response from the API after creating the contact.
 * @throws An ActionError if the input validation fails.
 */
export default async function runAction(nango: NangoAction, input: CreateContact): Promise<Contact> {
    const parsedInput = createContactSchema.safeParse(input);

    if (!parsedInput.success) {
        for (const error of parsedInput.error.errors) {
            await nango.log(`Invalid input provided to create a contact: ${error.message} at path ${error.path.join('.')}`, { level: 'error' });
        }
        throw new nango.ActionError({
            message: 'Invalid input provided to create a contact'
        });
    }

    // lowercase all properties parsedInput.data.properties keys
    for (const key in parsedInput.data.properties) {
        const lowerKey = key.toLowerCase();
        if (lowerKey !== key) {
            parsedInput.data.properties[lowerKey] = parsedInput.data.properties[key];
            delete parsedInput.data.properties[key];
        }
    }

    const response = await nango.post<HubspotContactResponse>({
        // https://developers.hubspot.com/docs/api/crm/contacts
        endpoint: `/crm/v3/objects/contacts`,
        retries: 10,
        data: parsedInput.data
    });

    const contact: Contact = {
        id: response.data.id,
        createdAt: response.data.createdAt,
        updatedAt: response.data.updatedAt,
        firstName: response.data.properties.firstname || '',
        lastName: response.data.properties.lastname || '',
        email: response.data.properties.email || ''
    };

    return contact;
}
