import type { NangoAction, ProxyConfiguration, SuccessResponse, IdEntity } from '../../models';
import { idEntitySchema } from '../schema.zod.js';
import type { LucidUser } from '../types';

/**
 * Deletes an Lucid user contact.
 *
 * This function validates the input against the defined schema and constructs a request
 * to the Lucid API to delete a user by their ID. If the input is invalid,
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
 * https://lucid.readme.io/reference/overview-scim
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
        // https://lucid.readme.io/reference/modifyuserpatch
        endpoint: `/v2/Users/${parsedInput.data.id}`,
        method: 'PATCH',
        data: {
            schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
            Operations: [
                {
                    op: 'replace',
                    path: 'active',
                    value: false
                }
            ]
        },
        retries: 10
    };

    await nango.patch<LucidUser>(config);

    return {
        success: true
    };
}
