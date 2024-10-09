import type { NangoAction, Contact, UpdateContact } from '../../models';
import { updateContactSchema } from '../schema.zod.js';

/**
 * Executes an action to update a contact based on the provided input.
 * It validates the input against the defined schema, logs any validation errors,
 * and then sends a PATCH request to update a contact if the input is valid.
 * @param nango - An instance of NangoAction used for logging and making API requests.
 * @param input - The input data required to update a contact.
 * @returns A promise that resolves to the response from the API after updating the contact.
 * @throws An ActionError if the input validation fails.
 */
export default async function runAction(nango: NangoAction, input: UpdateContact): Promise<Contact> {
    const parsedInput = updateContactSchema.safeParse(input);

    if (!parsedInput.success) {
        for (const error of parsedInput.error.errors) {
            await nango.log(`Invalid input provided to update a contact: ${error.message} at path ${error.path.join('.')}`, { level: 'error' });
        }
        throw new nango.ActionError({
            message: 'Invalid input provided to update a contact'
        });
    }

    // lowercase all properties parsedInput.data.properties keys
    for (const key in parsedInput.data.input.properties) {
        const lowerKey = key.toLowerCase();
        if (lowerKey !== key) {
            parsedInput.data.input.properties[lowerKey] = parsedInput.data.input.properties[key];
            delete parsedInput.data.input.properties[key];
        }
    }

    const inputData = parsedInput.data;

    const response = await nango.patch({
        endpoint: `/crm/v3/objects/contacts/${inputData.contactId}`,
        data: inputData.input,
        retries: 10,
        ...(inputData.input.idProperty ? { params: { idProperty: inputData.input.idProperty } } : {})
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
