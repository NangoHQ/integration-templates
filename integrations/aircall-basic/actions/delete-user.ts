import type { NangoAction, ProxyConfiguration, SuccessResponse, EmailEntity, User } from '../../models';
import type { AircallUser } from '../types';

export default async function runAction(nango: NangoAction, input: EmailEntity): Promise<SuccessResponse> {
    if (!input || !input.email) {
        throw new nango.ActionError({
            message: 'Email is required'
        });
    }

    const config: ProxyConfiguration = {
        // https://developer.aircall.io/api-references/#list-all-users
        endpoint: '/v1/users',
        retries: 10,
        paginate: {
            response_path: 'users'
        }
    };
    
    let foundUserId: string | undefined;

    for await (const aUsers of nango.paginate<AircallUser>(config)) {
        const matchingUser = aUsers.find((aUser) => aUser.email === input.email);
        if (matchingUser) {
            foundUserId = matchingUser.id.toString();
            break;
        }
    }

    if (!foundUserId) {
        throw new nango.ActionError({
            message: 'Could not find user with the specified email'
        });
    }

    await nango.delete({
        // https://developer.aircall.io/api-references/#delete-a-user
        endpoint: `/v1/users/${foundUserId}`,
        retries: 10
    });

    return {
        success: true
    }

}
