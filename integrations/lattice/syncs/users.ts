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
            const nameParts = latticeUser.name?.split(' ') || [];

            let firstName: string = '';
            let lastName: string = '';
            if (nameParts.length > 0) {
                firstName = nameParts[0] || '';

                if (nameParts.length > 1) {
                    lastName = nameParts.slice(1).join(' ');
                }
            }

            return {
                id: latticeUser.id?.toString() || '',
                firstName: firstName,
                lastName: lastName,
                email: latticeUser.email || ''
            };
        });

        await nango.batchSave(users, 'User');
    }
}
