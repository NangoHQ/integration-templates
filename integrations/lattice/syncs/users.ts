import type { NangoSync, ProxyConfiguration, User } from '../../models';
import type { LatticeUser } from '../types';

export default async function fetchData(nango: NangoSync) {
    const proxyConfiguration: ProxyConfiguration = {
        // https://developers.lattice.com/reference/api_users
        endpoint: '/developer/v1/users',
        paginate: {
            type: 'cursor',
            cursor_name_in_request: 'startingAfter',
            cursor_path_in_response: 'endingCursor',
            response_path: 'data',
            limit: 100,
            limit_name_in_request: 'limit'
        },
        params: {
            state: 'ACTIVE'
        }
    };

    for await (const latticeUsers of nango.paginate<LatticeUser>(proxyConfiguration)) {
        const users: User[] = latticeUsers.map((latticeUser: LatticeUser) => {
            const [firstName = '', ...lastNameParts] = latticeUser.name?.split(' ') || [];
            const lastName = lastNameParts.join(' ') || '';

            return {
                id: latticeUser.id?.toString() || '',
                firstName,
                lastName,
                email: latticeUser.email || ''
            };
        });

        await nango.batchSave(users, 'User');
    }
}
