import type { NangoSync, ProxyConfiguration } from '../../models.js';
import type { GemTeamUser } from '../types.js';
import { toUser } from '../mappers/to-user.js';

export default async function fetchData(nango: NangoSync): Promise<void> {
    const proxyConfig: ProxyConfiguration = {
        // https://api.gem.com/v0/reference#tag/Users/paths/~1v0~1users/get
        endpoint: '/v0/users',
        paginate: {
            type: 'offset',
            offset_name_in_request: 'page',
            offset_start_value: 1,
            limit_name_in_request: 'per_page',
            limit: 100
        },
        retries: 10
    };

    for await (const users of nango.paginate<GemTeamUser>(proxyConfig)) {
        const mappedUsers = users.map(toUser);
        await nango.batchSave(mappedUsers, 'User');
    }
}
