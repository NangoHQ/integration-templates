import type { NangoAction, ProxyConfiguration, CreateUser, CreatedUser } from '../../models';

/**
 * Validates the input for the create user action.
 * Throws an error if the required fields are missing:
 * - 'accountId' is always required.
 * - 'username' is always required.
 * - 'email' is always required.
 *
 * For more info about required fields, check the documentation:
 * https://developers.docusign.com/docs/esign-rest-api/reference/users/users/create/
 */
function validateInput(nango: NangoAction, input: CreateUser): void {
    if (!input) {
        throw new nango.ActionError({
            message: 'input parameters are required'
        });
    }

    if (!input.accountId) {
        throw new nango.ActionError({
            message: 'accountId is required'
        });
    }

    if (!input.userName) {
        throw new nango.ActionError({
            message: 'userName is required'
        });
    }

    if (!input.email) {
        throw new nango.ActionError({
            message: 'email is required'
        });
    }
}

/**
 * Executes the create user action by validating input, constructing the request configuration,
 * and making the API call to create a new user.
 */
export default async function runAction(nango: NangoAction, input: CreateUser): Promise<CreatedUser> {
    validateInput(nango, input);

    const { accountId, ...newUser } = input;

    const config: ProxyConfiguration = {
        // https://developers.docusign.com/docs/esign-rest-api/reference/users/users/create/
        endpoint: `/restapi/v2.1/accounts/${input.accountId}/users`,
        data: {
            newUsers: [newUser]
        },
        retries: 10
    };

    const response = await nango.post(config);

    return response.data;
}

// TODO: update input type
// TODO: update return type
