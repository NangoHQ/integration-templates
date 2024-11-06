import type { NangoSync, ProxyConfiguration, User } from '../../models';
import type { DropboxUserResponse, DropboxUser } from '../types';

export default async function fetchData(nango: NangoSync) {
    const config: ProxyConfiguration = {
        // https://www.dropbox.com/developers/documentation/http/teams#team-members-list
        endpoint: `/2/team/members/list_v2`,
        retries: 10
    };

    const response = await nango.post<DropboxUserResponse>(config);

    const { data } = response;

    const { members } = data;
    let hasMore = data.has_more;
    let cursor = data.cursor;

    const users: User[] = members.map((member: DropboxUser) => {
        return {
            id: member.profile.account_id,
            firstName: member.profile.name.given_name,
            lastName: member.profile.name.surname,
            email: member.profile.email
        };
    });

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

        const response = await nango.get<DropboxUserResponse>(userConfig);

        const { data } = response;

        const { members } = data;
        hasMore = data.has_more;
        cursor = data.cursor;

        const users: User[] = members.map((member: DropboxUser) => {
            return {
                id: member.profile.account_id,
                firstName: member.profile.name.given_name,
                lastName: member.profile.name.surname,
                email: member.profile.email
            };
        });

        await nango.batchSave(users, 'User');
    }
}
