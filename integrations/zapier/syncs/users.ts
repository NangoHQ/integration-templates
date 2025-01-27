import type { NangoSync, ProxyConfiguration, User } from '../../models';
import { toUser } from '../mappers/to-user.js';
import type { ZapierUser } from '../types';

export default async function fetchData(nango: NangoSync): Promise<void> {
    const config: ProxyConfiguration = {
        // https://help.zapier.com/hc/en-us/articles/8496291497741-Provision-user-accounts-with-SCIM#h_01HE8NPZMWDB3JG39AKV820GCX
        endpoint: '/Users',
        baseUrlOverride: 'https://zapier.com/scim/v2',
        paginate: {
            type: 'offset',
            offset_name_in_request: 'startIndex',
            offset_start_value: 1,
            offset_calculation_method: 'per-page',
            limit_name_in_request: 'count',
            response_path: 'Resources',
            limit: 100
        },
        retries: 10
    };

    for await (const ScimUsers of nango.paginate<ZapierUser>(config)) {
        const users: User[] = ScimUsers.map(toUser);

        await nango.batchSave<User>(users, 'User');
    }
}
