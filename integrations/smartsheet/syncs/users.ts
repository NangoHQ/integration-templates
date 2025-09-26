import { createSync } from 'nango';
import type { SmartsheetUser, SmartsheetUserListResponse } from '../types.js';

import type { ProxyConfiguration } from 'nango';
import { User } from '../models.js';
import { z } from 'zod';

const sync = createSync({
    description: 'Fetches a list of users from Smartsheet',
    version: '1.0.0',
    frequency: 'every 6 hours',
    autoStart: true,
    syncType: 'incremental',

    endpoints: [
        {
            method: 'GET',
            path: '/users',
            group: 'Users'
        }
    ],

    scopes: ['READ_USERS'],

    models: {
        User: User
    },

    metadata: z.object({}),

    exec: async (nango) => {
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
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
