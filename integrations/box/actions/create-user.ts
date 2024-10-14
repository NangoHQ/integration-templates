import type { NangoAction, CreateUser, CreatedUser } from '../../models';

/**
 * Validates the input for the create user action.
 * Throws an error if the required fields are missing:
 * - 'login' is required unless 'is_platform_access_only' is set to true.
 * - 'name' is always required.
 *
 * For more info about required fields, check the documentation:
 * https://developer.box.com/reference/post-users/
 */
function validateInput(nango: NangoAction, input: CreateUser): void {
    if (!input.login && input.is_platform_access_only !== true) {
        throw new nango.ActionError({
            message: 'The email address the user uses to log in is required'
        });
    }

    if (!input.name) {
        throw new nango.ActionError({
            message: 'Name is required'
        });
    }
}

/**
 * Executes the create user action by validating input, constructing the request configuration,
 * and making the API call to create a new user.
 */
export default async function runAction(nango: NangoAction, input: CreateUser): Promise<CreatedUser> {
    validateInput(nango, input);

    const config = {
        // https://developer.box.com/reference/post-users/
        endpoint: `/2.0/users`,
        data: input,
        retries: 10
    };

    const response = await nango.post(config);

    return response.data;
}
