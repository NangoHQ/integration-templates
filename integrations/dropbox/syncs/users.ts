import type { NangoSync, ProxyConfiguration, User } from '../../models';
import type { DropboxUserResponse, DropboxUser } from '../types';


/**
 * Fetches users from Dropbox and returns them along with pagination information.
 * 
 * @param {NangoSync} nango - The NangoSync instance used to make requests.
 * @param {ProxyConfiguration} config - The configuration for the proxy request.
 * @returns {Promise<{ users: User[], hasMore: boolean, cursor: string }>} - A promise that resolves to an object containing users, pagination info, and a cursor.
 */
async function fetchUsers(nango: NangoSync, config: ProxyConfiguration): Promise<{ users: User[], hasMore: boolean, cursor: string }> {
    const response = await nango.post<DropboxUserResponse>(config);
    const { data } = response;
    const { members, has_more, cursor } = data;

    const users: User[] = members.map((member: DropboxUser) => {
        return {
            id: member.profile.account_id,
            firstName: member.profile.name.given_name,
            lastName: member.profile.name.surname,
            email: member.profile.email
        };
    });

    return { users, hasMore: has_more, cursor };
}

export default async function fetchData(nango: NangoSync) {
    const initialConfig: ProxyConfiguration = {
        // https://www.dropbox.com/developers/documentation/http/teams#team-members-list
        endpoint: `/2/team/members/list_v2`,
        retries: 10
    };

    let { users, hasMore, cursor } = await fetchUsers(nango, initialConfig);
    await nango.batchSave(users, 'User');

    while (hasMore) {
        const userConfig: ProxyConfiguration = {
            // https://www.dropbox.com/developers/documentation/http/teams#team-members-list/continue
            endpoint: `/2/team/members/list/continue`,
            params: {
                cursor
            },
            retries: 10
        };

        ({ users, hasMore, cursor } = await fetchUsers(nango, userConfig));
        await nango.batchSave(users, 'User');
    }
}
