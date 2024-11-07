import type { NangoAction, ProxyConfiguration, SuccessResponse, EmailEntity } from '../../models';
import type { HarvestUser } from '../types';
import { emailEntitySchema } from '../schema.zod';
/**
 * Gets the Harvest user ID for a given email address by querying the users endpoint.
 * 
 * @param nango - The Nango action context for making API requests
 * @param email - The email address to look up
 * @returns The ID of the matching user as a string
 * @throws {nango.ActionError} If no user is found with the given email
 */

async function getUserIdByEmail(nango: NangoAction, email: string): Promise<string> {
    const getUsersConfig: ProxyConfiguration = {
        endpoint: '/v2/users',
        params: {
            is_active: 'true'
        },
        paginate: {
            type: 'link',
            response_path: 'users',
            link_path_in_response_body: 'links.next'
        },
        retries: 10
    };

    for await (const harvestUsers of nango.paginate<HarvestUser>(getUsersConfig)) {
        const matchingUser = harvestUsers.find(user => user.email === email);
        if (matchingUser) {
            return matchingUser.id.toString();
        }
    }

    throw new nango.ActionError({
        message: `No user found with email ${email}`
    });
}

/**
 * Deletes a Haverst user.
 *
 * This function validates the input against the defined schema and constructs a request
 * to the Harvest API to delete a user contact by their ID. If the input is invalid,
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

    const userId = await getUserIdByEmail(nango, parsedInput.data.email);

    const deleteUserConfig: ProxyConfiguration = {
        endpoint: `/v2/users/${userId}`,
        retries: 10
    };

    await nango.delete(deleteUserConfig);

    return {
        success: true
    };
}
