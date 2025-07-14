import type { NangoSync, ProxyConfiguration, User } from '../../models.js';
import type { DatadogUser } from '../types.js';

export default async function fetchData(nango: NangoSync) {
    const config: ProxyConfiguration = {
        // https://docs.datadoghq.com/api/latest/users/#list-all-users
        endpoint: '/v2/users',
        retries: 10,
        params: {
            // @ts-expect-error param type mismatch
            filter: {
                status: 'active'
            }
        },
        paginate: {
            type: 'offset',
            offset_name_in_request: 'page[number]',
            offset_calculation_method: 'per-page',
            response_path: 'data',
            limit_name_in_request: 'page[size]'
        }
    };

    for await (const dUsers of nango.paginate<DatadogUser>(config)) {
        const users: User[] = dUsers.map((dUser: DatadogUser) => {
            const [firstName, lastName] = dUser.attributes.name.split(' ');
            const user: User = {
                id: dUser.id,
                email: dUser.attributes.email,
                firstName: firstName || '',
                lastName: lastName || ''
            };

            return user;
        });

        await nango.batchSave(users, 'User');
    }
}
