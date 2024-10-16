import type { NangoAction, ProxyConfiguration, SuccessResponse, BoxDeleteUser } from '../../models';

/**
 * Validates the input for the delete user action.
 * Throws an error if the input is missing or if the required 'id' field is not provided.
 *
 * For more info about required fields, check the documentation:
 * https://developer.box.com/reference/delete-users-id/
 */
function validateInput(nango: NangoAction, input: BoxDeleteUser): void {
    if (!input || !input.id) {
        throw new nango.ActionError({
            message: 'Id is required'
        });
    }
}

/**
 * Constructs the API endpoint URL for deleting a user based on the provided input.
 */
function getEndpoint(input: BoxDeleteUser): string {
    const endpoint = `/2.0/users/${input.id}`;

    const queryParams = Object.entries({
        ...(input.force ? { force: input.force } : {}),
        ...(input.notify ? { notify: input.notify } : {})
    })
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');

    const params = queryParams ? `&${queryParams}` : '';

    return `${endpoint}${params}`;
}

/**
 * Executes the delete user action by validating input, constructing the endpoint,
 * and making the API call to Box to delete the specified user.
 */
export default async function runAction(nango: NangoAction, input: BoxDeleteUser): Promise<SuccessResponse> {
    validateInput(nango, input);

    const config: ProxyConfiguration = {
        // https://developer.box.com/reference/delete-users-id/
        endpoint: getEndpoint(input),
        retries: 10
    };

    await nango.delete(config);

    return {
        success: true
    };
}
