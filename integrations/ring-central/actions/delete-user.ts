import type { NangoAction, ProxyConfiguration, SuccessResponse, IdEntity } from '../../models';
import { idEntitySchema } from '../schema.zod.js';

/**
 * Deletes a RingCentral user.
 *
 * This function validates the input against the defined schema and constructs a request
 * to the RingCentral API to delete a user by their ID. If the input is invalid,
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
 * https://developers.ringcentral.com/api-reference/SCIM/scimDeleteUser2
 */
export default async function runAction(nango: NangoAction, input: IdEntity): Promise<SuccessResponse> {
    nango.zodValidateInput({ zodSchema: idEntitySchema, input });

    // no body content expected for successful requests
    await nango.delete(config);

    return {
        success: true
    };
}
