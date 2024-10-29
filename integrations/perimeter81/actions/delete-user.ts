import type { NangoAction, ProxyConfiguration, SuccessResponse, IdEntity } from '../../models';
import { idEntitySchema } from '../schema.zod.js';

/**
 * Deletes a Perimeter81 user.
 *
 * This function validates the input against the defined schema and constructs a request
 * to the Perimeter81 API to delete a user by their ID. If the input is invalid,
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
 * https://support.perimeter81.com/docs/delete-delete-user
 */
export default async function runAction(nango: NangoAction, input: IdEntity): Promise<SuccessResponse> {
    const parsedInput = idEntitySchema.safeParse(input);

    if (!parsedInput.success) {
        for (const error of parsedInput.error.errors) {
            await nango.log(`Invalid input provided to delete a user: ${error.message} at path ${error.path.join('.')}`, { level: 'error' });
        }

        throw new nango.ActionError({
            message: 'Invalid input provided to delete a user'
        });
    }

    const config: ProxyConfiguration = {
        // https://developers.ringcentral.com/api-reference/SCIM/scimDeleteUser2
        endpoint: `/v1/users/${parsedInput.data.id}`,
        retries: 10
    };

    // no body content expected for successful requests
    await nango.delete(config);

    return {
        success: true
    };
}
