import type { NangoAction, ProxyConfiguration, SuccessResponse, BoxDeleteUser, User } from '../../models';
import { boxDeleteUserSchema } from '../schema.zod';
/**
 * Validates the input for the delete user action.
 * Throws an error if the input is missing or if the required 'id' field is not provided.
 *
 * For more info about required fields, check the documentation:
 * https://developer.box.com/reference/delete-users-id/
 */

/**
 * Constructs the API endpoint URL for deleting a user based on the provided input.
 */
function getEndpoint(userId: string, input: BoxDeleteUser): string {
    const endpoint = `/2.0/users/${userId}`;

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

    const result = boxDeleteUserSchema.safeParse(input);
    if (!result.success) {
        throw new nango.ActionError({
            message: 'Invalid input: ' + result.error.message
        });
    }

    const getUsersConfig: ProxyConfiguration = {
        // https://developer.box.com/reference/get-users/
        endpoint: '/2.0/users',
        params: {
            // Box API has two pagination options:
            // 1. offset (default)
            // 2. marker (next_marker and prev_marker)
            userMarker: 'true'
        },
        paginate: {
            type: 'cursor',
            cursor_path_in_response: 'next_marker',
            limit_name_in_request: 'limit',
            cursor_name_in_request: 'marker',
            response_path: 'entries',
            limit: 100
        }
    };

    let foundUserId: string | null = null;
    
    for await (const boxUsers of nango.paginate(getUsersConfig)) {
        for (const user of boxUsers) {
            if (user.email === input.email) {
                foundUserId = user.id;
                break;
            }
        }
        
        if (foundUserId) {
            break;
        }
    }

    if (!foundUserId) {
        throw new Error(`No user found with email ${input.email}`);
    }
    

    const deleteUserConfig: ProxyConfiguration = {
        // https://developer.box.com/reference/delete-users-id/
        endpoint: getEndpoint(foundUserId, input),
        retries: 10
    };

    await nango.delete(deleteUserConfig);

    return {
        success: true
    };
}
