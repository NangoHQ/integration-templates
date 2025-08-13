import { createAction } from 'nango';
import { CreatePropertyInputSchema } from '../schema.js';

import { CreatedProperty, CreatePropertyInput } from '../models.js';

/**
 * Executes an action to create a custom property in the CRM.
 * It validates the input against the defined schema, logs any validation errors,
 * and then sends a POST request to create the custom properties if the input is valid.
 * @param nango - An instance of NangoAction used to interact with the Nango API and handle logging.
 * @param input - The input data for creating the custom property, validated by the CustomPropertyInputSchema.
 * @returns A promise that resolves with the result of the API call, which includes the details of the created custom property.
 * @throws An ActionError if the input validation fails.
 */
const action = createAction({
    description: 'Create a property in Hubspot',
    version: '2.0.0',

    endpoint: {
        method: 'POST',
        path: '/properties',
        group: 'Properties'
    },

    input: CreatePropertyInput,
    output: CreatedProperty,

    scopes: [
        'oauth',
        'crm.schemas.orders.write',
        'crm.objects.orders.write',
        'crm.schemas.contacts.write',
        'crm.schemas.carts.write',
        'crm.schemas.deals.write',
        'crm.objects.users.write',
        'crm.schemas.companies.write',
        'crm.objects.carts.write'
    ],

    exec: async (nango, input): Promise<CreatedProperty> => {
        const parsedInput = await nango.zodValidateInput({ zodSchema: CreatePropertyInputSchema, input });

        const inputData = parsedInput.data;

        const response = await nango.post({
            // https://developers.hubspot.com/docs/api/crm/properties
            endpoint: `/crm/v3/properties/${inputData.objectType}`,
            data: inputData.data,
            retries: 3
        });

        return response.data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
