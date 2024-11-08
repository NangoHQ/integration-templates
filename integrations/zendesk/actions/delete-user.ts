import type { NangoAction, ProxyConfiguration, SuccessResponse, EmailEntity } from '../../models';
import { getSubdomain } from '../helpers/get-subdomain.js';
import { ZendeskUser } from '../types';
import { emailEntitySchema } from '../schema.zod';


export default async function runAction(nango: NangoAction, input: EmailEntity): Promise<SuccessResponse> {

    const parsedInput = emailEntitySchema.safeParse(input);
    if (!parsedInput.success) {
        throw new nango.ActionError({
            message: 'Invalid input provided to delete a user'
        });
    }

    const subdomain = await getSubdomain(nango);

    const foundUserId = await findUserByEmail(nango, subdomain, input.email);

    if (!foundUserId) {
        throw new nango.ActionError({   
            message: `No user found with email ${input.email}`
        });
    }

    const deleteConfig: ProxyConfiguration = {
        // https://developer.zendesk.com/api-reference/ticketing/users/users/#delete-user
        baseUrlOverride: `https://${subdomain}.zendesk.com`,
        endpoint: `/api/v2/users/${foundUserId}`,
        retries: 10
    };

    await nango.delete(deleteConfig);

    return {
        success: true
    };
}

/**
 * Finds a Zendesk user by their email address
 * @param nango - The NangoAction instance for making API calls
 * @param subdomain - The Zendesk subdomain to use in the API URL
 * @param email - The email address to search for
 * @returns The user ID if found, null otherwise
 */
async function findUserByEmail(nango: NangoAction, subdomain: string|undefined, email: string): Promise<string | null> {

    const roles = ['agent', 'admin'];

    const getUserConfig: ProxyConfiguration = {
        // https://developer.zendesk.com/api-reference/ticketing/users/users/#list-users
        baseUrlOverride: `https://${subdomain}.zendesk.com`,
        endpoint: `/api/v2/users`,
        retries: 10,
        params: {
            roles: roles.join(',')
        },
        paginate: {
            response_path: 'users'
        }
    };

    for await (const zUsers of nango.paginate<ZendeskUser>(getUserConfig)) {
        const matchingUser = zUsers.find((zUser: ZendeskUser) => zUser.email === email);
        if (matchingUser) {
            return matchingUser.id.toString();
        }
    }

    return null;
}
