import type { EmailEntity, NangoAction, ProxyConfiguration, SuccessResponse } from '../../models';
import { emailEntitySchema } from '../schema.zod.js';
import { Perimeter81User } from '../types';

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
 */
export default async function runAction(nango: NangoAction, input: EmailEntity): Promise<SuccessResponse> {
    const parsedInput = emailEntitySchema.safeParse(input);

    if (!parsedInput.success) {
        throw new nango.ActionError({
            message: 'Invalid input provided to delete a user'
        });
    }

    const userId = await findUserByEmail(nango, parsedInput.data.email);

    const deleteUserConfig: ProxyConfiguration = {
        // https://support.perimeter81.com/docs/delete-delete-user
        endpoint: `/v1/users/${userId}`,
        retries: 10
    };

    await nango.delete(deleteUserConfig);

    return {
        success: true
    };
}


/**
 * Finds a Perimeter81 user by their email address.
 *
 * @param {NangoAction} nango - The Nango action context, used for logging and making API requests.
 * @param {string} email - The email address of the user to find.
 * @returns {Promise<string>} - A promise that resolves to the ID of the user.
 * @throws {nango.ActionError} - Throws an error if no user is found with the given email.
 */
async function findUserByEmail(nango: NangoAction, email: string): Promise<string> {
    const findUserConfig: ProxyConfiguration = {
        // https://support.perimeter81.com/docs/get-list-users
        endpoint: '/v1/users',
        paginate: {
            type: 'offset',
            offset_name_in_request: 'page',
            offset_start_value: 1,
            offset_calculation_method: 'per-page',
            limit_name_in_request: 'limit',
            response_path: 'data',
            limit: 100
        },
        retries: 10
    };

    for await (const perimeter81Users of nango.paginate<Perimeter81User>(findUserConfig)) {
        const matchingUser = perimeter81Users.find(user => user.email === email);
        if (matchingUser) {
            return matchingUser.id;
        }
    }

    throw new nango.ActionError({
        message: `No user found with email ${email}`
    });
}