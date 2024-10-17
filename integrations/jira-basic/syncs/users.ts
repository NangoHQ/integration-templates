import type { NangoSync, ProxyConfiguration, User } from '../../models';
import type { JiraUser } from '../types';

export default async function fetchData(nango: NangoSync) {
    const config: ProxyConfiguration = {
        // https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-users/#api-rest-api-3-users-search-get
        endpoint: '/rest/api/3/users/search',
        retries: 10,
        paginate: {
            type: 'offset',
            limit_name_in_request: 'maxResults',
            response_path: '',
            offset_name_in_request: 'startAt'
        }
    };

    for await (const jUsers of nango.paginate<JiraUser>(config)) {
        const users: User[] = jUsers.map((zUser: JiraUser) => {
            const [firstName, lastName] = zUser.displayName.split(' ');
            return {
                id: zUser.accountId,
                firstName: firstName || '',
                lastName: lastName || '',
                email: zUser.emailAddress || ''
            };
        });

        await nango.batchSave(users, 'User');
    }
}
