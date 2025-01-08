import type { NangoSync, ProxyConfiguration, User } from '../../models';
import type { SmartsheetUser, SmartsheetUserListResponse } from '../types';

export default async function fetchData(nango: NangoSync) {
    const params: Record<string, string> = {};
    const proxyConfiguration: ProxyConfiguration = {
        // https://smartsheet.redoc.ly/tag/users
        endpoint: '/2.0/users',
        params
    };

    if (nango.lastSyncDate) {
        proxyConfiguration.params = {
            modifiedSince: nango.lastSyncDate.toISOString()
        };
    }

    let currentPage = 1;
    const pageSize = 100;

    while (true) {
        const response = await nango.get<SmartsheetUserListResponse>({
            ...proxyConfiguration,
            params: {
                ...params,
                pageSize,
                page: currentPage
            },
            retries: 10
        });

        if (!response.data || !response.data.data || !response.data.totalPages) {
            throw new Error('No data found');
        }

        const smartsheetUsers = response.data.data;

        const users: User[] =
            smartsheetUsers?.map((smartsheetUser: SmartsheetUser) => ({
                id: smartsheetUser.id?.toString() || '',
                firstName: smartsheetUser.firstName || '',
                lastName: smartsheetUser.lastName || '',
                email: smartsheetUser.email || ''
            })) || [];

        await nango.batchSave(users, 'User');

        if (currentPage >= response.data?.totalPages) {
            break;
        }

        currentPage++;
    }
}
