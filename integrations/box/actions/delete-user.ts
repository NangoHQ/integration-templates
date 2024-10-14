import type { NangoAction, SuccessResponse, DeleteUser } from '../../models';

/**
 * Validates the input for the delete user action.
 * Throws an error if the input is missing or if the required 'id' field is not provided.
 */
function validateInput(nango: NangoAction, input: DeleteUser): void {
    if (!input || !input.id) {
        throw new nango.ActionError({
            message: 'Id is required'
        });
    }
}

/**
 * Constructs the API endpoint URL for deleting a user based on the provided input.
 */
function getEndpoint(input: DeleteUser): string {
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
export default async function runAction(nango: NangoAction, input: DeleteUser): Promise<SuccessResponse> {
    validateInput(nango, input);

    const config = {
        // https://developer.box.com/reference/delete-users-id/
        endpoint: getEndpoint(input),
        retries: 10
    };

    await nango.delete(config);

    return {
        success: true
    };
}
