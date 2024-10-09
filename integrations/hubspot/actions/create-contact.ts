import type { NangoAction, ObjectResponse, CreateContactInput } from '../../models';
import { createContactSchema } from '../schema.zod.js';

/**
 * Executes an action to create a contact based on the provided input.
 * It validates the input against the defined schema, logs any validation errors,
 * and then sends a POST request to create a contact if the input is valid.
 * @param nango - An instance of NangoAction used for logging and making API requests.
 * @param input - The input data required to create a contact.
 * @returns A promise that resolves to the response from the API after creating the contact.
 * @throws An ActionError if the input validation fails.
 */
export default async function runAction(nango: NangoAction, input: CreateContactInput): Promise<ObjectResponse> {
    const parsedInput = createContactSchema.safeParse(input);

    if (!parsedInput.success) {
        for (const error of parsedInput.error.errors) {
            await nango.log(`Invalid input provided to create a contact: ${error.message} at path ${error.path.join('.')}`, { level: 'error' });
        }
        throw new nango.ActionError({
            message: 'Invalid input provided to create a contact'
        });
    }

    const response = await nango.post({
        endpoint: `/crm/v3/objects/contacts`,
        retries: 10,
        data: parsedInput.data
    });

    return response.data;
}
