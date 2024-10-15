import type { User, ProxyConfiguration, NangoSync } from '../../models';
import type { HubspotUser } from '../types';

export default async function fetchData(nango: NangoSync) {
    let totalRecords = 0;

    const config: ProxyConfiguration = {
        endpoint: '/settings/v3/users',
        paginate: {
            type: 'cursor',
            cursor_path_in_response: 'paging.next.after',
            limit_name_in_request: 'limit',
            cursor_name_in_request: 'after',
            response_path: 'results',
            limit: 100
        }
    };
    for await (const user of nango.paginate(config)) {
        const mappedUser: User[] = user.map(mapUser) || [];

        const batchSize: number = mappedUser.length;
        totalRecords += batchSize;
        await nango.log(`Saving batch of ${batchSize} users (total users: ${totalRecords})`);
        await nango.batchSave(mappedUser, 'User');
    }
}

function mapUser(user: HubspotUser): User {
    return {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roleIds: user.roleIds,
        primaryTeamId: user.primaryTeamId,
        superAdmin: user.superAdmin
    };
}
