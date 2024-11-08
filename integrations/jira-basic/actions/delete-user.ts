import type { NangoAction, ProxyConfiguration, SuccessResponse, EmailEntity } from '../../models';
import { JiraUser } from '../types';
import { emailEntitySchema } from '../schema.zod';


export default async function runAction(nango: NangoAction, input: EmailEntity): Promise<SuccessResponse> {
    const parsedInput = emailEntitySchema.safeParse(input);

    if (!parsedInput.success) {
        throw new nango.ActionError({
            message: 'Invalid input provided to delete a user'
        });
    }

    const userId = await findUserByEmail(nango, input.email);

    const deleteUserConfig: ProxyConfiguration = {
        // https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-users/#api-rest-api-3-user-delete
        endpoint: `/rest/api/3/user`,
        params: {
            accountId: userId
        },
        retries: 10
    };

    await nango.delete(deleteUserConfig);

    return {
        success: true
    };
}

/**
 * Searches for a Jira user by their email address and returns their account ID
 * 
 * @param nango - The NangoAction instance used to make API calls
 * @param email - The email address of the user to find
 * @returns Promise<string> - The account ID of the found user
 * @throws Error if no user is found with the given email
 */
async function findUserByEmail(nango: NangoAction, email: string): Promise<string> {
    // https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-users/#api-rest-api-3-users-search-get
    const fetchUsersConfig: ProxyConfiguration = {
        endpoint: '/rest/api/3/users/search',
        retries: 10,
        paginate: {
            type: 'offset',
            limit_name_in_request: 'maxResults',
            response_path: '',
            offset_name_in_request: 'startAt'
        }
    };

    for await (const jUsers of nango.paginate<JiraUser>(fetchUsersConfig)) {
        for (const jUser of jUsers) {
            if (jUser.emailAddress === email) {
                return jUser.accountId;
            }
        }
    }

    throw new Error(`No user found with email ${email}`);
}