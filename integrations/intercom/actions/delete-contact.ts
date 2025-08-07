import type { NangoAction, ProxyConfiguration, SuccessResponse, IdEntity } from '../../models.js';
import { idEntitySchema } from '../schema.zod.js';
import type { IntercomDeleteContactResponse } from '../types.js';

/**
 * Deletes an Intercom contact.
 *
 * This function validates the input against the defined schema and constructs a request
 * to the Intercom API to delete a contact by their ID. If the input is invalid,
 * it logs the errors and throws an ActionError.
 *
 * @param {NangoAction} nango - The Nango action context, used for logging and making API requests.
 * @param {IdEntity} input - The input data containing the ID of the contact to be deleted
 *
 * @returns {Promise<SuccessResponse>} - A promise that resolves to a SuccessResponse object indicating the result of the deletion.
 *
 * @throws {nango.ActionError} - Throws an error if the input validation fails.
 *
 * For detailed endpoint documentation, refer to:
 * https://developers.intercom.com/docs/references/rest-api/api.intercom.io/contacts/deletecontact
 */
export default async function runAction(nango: NangoAction, input: IdEntity): Promise<SuccessResponse> {
    const parsedInput = await nango.zodValidateInput({ zodSchema: idEntitySchema, input });

    const config: ProxyConfiguration = {
        // https://developers.intercom.com/docs/references/rest-api/api.intercom.io/contacts/deletecontact
        endpoint: `/contacts/${parsedInput.data.id}`,
        retries: 3
    };

    const response = await nango.delete<IntercomDeleteContactResponse>(config);

    return {
        success: response.data.deleted
    };
}
