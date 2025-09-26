import { createSync } from 'nango';
import type { JiraUser } from '../types.js';

import type { ProxyConfiguration } from 'nango';
import { User } from '../models.js';
import { z } from 'zod';

const sync = createSync({
    description: 'Fetches a list of users from Jira',
    version: '1.0.0',
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

    models: {
        User: User
    },

    metadata: z.object({}),

    exec: async (nango) => {
        const config: ProxyConfiguration = {
            // https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-users/#api-rest-api-3-users-search-get
            endpoint: '/rest/api/3/users/search',
            retries: 10,
            paginate: {
                type: 'offset',
                limit_name_in_request: 'maxResults',
                response_path: '',
                offset_name_in_request: 'startAt'
            }
        };

        for await (const jUsers of nango.paginate<JiraUser>(config)) {
            const users: User[] = jUsers.map((zUser: JiraUser) => {
                const [firstName, lastName] = zUser.displayName.split(' ');
                return {
                    id: zUser.accountId,
                    firstName: firstName || '',
                    lastName: lastName || '',
                    email: zUser.emailAddress || ''
                };
            });

            await nango.batchSave(users, 'User');
        }
    await nango.deleteRecordsFromPreviousExecutions("User");
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
