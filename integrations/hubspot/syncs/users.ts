import { createSync } from 'nango';
import type { HubspotUser } from '../types.js';

import type { ProxyConfiguration } from 'nango';
import { User } from '../models.js';
import { z } from 'zod';

const sync = createSync({
    description: 'Fetches a list of users from Hubspot',
    version: '2.0.0',
    frequency: 'every day',
    autoStart: true,
    syncType: 'full',

    endpoints: [
        {
            method: 'GET',
            path: '/users',
            group: 'Users'
        }
    ],

    scopes: ['oauth', 'settings.users.read (standard scope)', 'crm.objects.users.read (granular scope)'],

    models: {
        User: User
    },

    metadata: z.object({}),

    exec: async (nango) => {
        let totalRecords = 0;

        const config: ProxyConfiguration = {
            // https://developers.hubspot.com/beta-docs/reference/api/settings/users/user-provisioning#get-%2Fsettings%2Fv3%2Fusers%2F
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
        await nango.deleteRecordsFromPreviousExecutions('User');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;

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
