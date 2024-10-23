import type { NangoAction, CreatedProperty, CreatePropertyInput } from '../../models';
import { CreatePropertyInputSchema } from '../schema.js';

/**
 * Executes an action to create a custom property in the CRM.
 * It validates the input against the defined schema, logs any validation errors,
 * and then sends a POST request to create the custom properties if the input is valid.
 * @param nango - An instance of NangoAction used to interact with the Nango API and handle logging.
 * @param input - The input data for creating the custom property, validated by the CustomPropertyInputSchema.
 * @returns A promise that resolves with the result of the API call, which includes the details of the created custom property.
 * @throws An ActionError if the input validation fails.
 */
export default async function runAction(nango: NangoAction, input: CreatePropertyInput): Promise<CreatedProperty> {
    const parsedInput = CreatePropertyInputSchema.safeParse(input);

    if (!parsedInput.success) {
        for (const error of parsedInput.error.errors) {
            await nango.log(`Invalid input provided to create custom property: ${error.message} at path ${error.path.join('.')}`, { level: 'error' });
        }
        throw new nango.ActionError({
            message: 'Invalid input provided to create custom property'
        });
    }

    const inputData = parsedInput.data;

    const response = await nango.post({
        // https://developers.hubspot.com/docs/api/crm/properties
        endpoint: `/crm/v3/properties/${inputData.objectType}`,
        data: inputData.data
    });

    return response.data;
}
