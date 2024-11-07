import type { NangoAction, NangoSync, ProxyConfiguration, SuccessResponse, EmailEntity } from '../../models';
import { fetchUsers } from '../helpers/fetch-user';

export default async function runAction(nango: NangoAction, input: EmailEntity): Promise<SuccessResponse> {
    if (!input || !input.email) {
        throw new nango.ActionError({
            message: 'Email is required'
        });
    }

    const initialConfig: ProxyConfiguration = {
        endpoint: `/2/team/members/list_v2`,
        retries: 10
    };

    let { users, hasMore, cursor } = await fetchUsers(nango, initialConfig);

    let userId: string | undefined;
    let user;

    do {
        user = users.find(user => user.email === input.email);
        if (user) {
            userId = user.id;
            break;
        }

        if (!hasMore) {
            throw new nango.ActionError({
                message: 'User not found'
            });
        }

        const userConfig: ProxyConfiguration = {
            endpoint: `/2/team/members/list/continue`,
            params: {
                cursor
            },
            retries: 10
        };

        ({ users, hasMore, cursor } = await fetchUsers(nango, userConfig));
    } while (!user);

    const config: ProxyConfiguration = {
        endpoint: `/2/team/members/remove`,
        data: {
            user: {
                '.tag': 'team_member_id',
                team_member_id: userId
            }
        },
        retries: 10
    };

    await nango.post(config);

    return {
        success: true
    };
}
