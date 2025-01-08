import type { NangoSync, ProxyConfiguration, User } from '../../models';
import type { smartsheetUser } from '../types';

export default async function fetchData(nango: NangoSync) {
    const proxyConfiguration: ProxyConfiguration = {
        // https://smartsheet.redoc.ly/tag/users
        endpoint: '/2.0/users',
        paginate: {
            type: 'offset',
            offset_name_in_request: 'page',
            offset_calculation_method: 'per-page',
            response_path: 'data'
        }
    };

    if (nango.lastSyncDate) {
        proxyConfiguration.params = {
            modifiedSince: nango.lastSyncDate.toISOString()
        };
    }

    for await (const smartsheetUsers of nango.paginate<smartsheetUser>(proxyConfiguration)) {
        const users: User[] = smartsheetUsers.map((smartsheetUser) => {
            return {
                id: smartsheetUser.id?.toString() || '',
                firstName: smartsheetUser.firstName || '',
                lastName: smartsheetUser.lastName || '',
                email: smartsheetUser.email || ''
            };
        });

        await nango.batchSave(users, 'User');
    }
}
