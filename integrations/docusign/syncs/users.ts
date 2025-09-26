import { createSync } from 'nango';
import { getRequestInfo } from '../helpers/get-request-info.js';
import type { DocuSignUser } from '../types.js';

import type { ProxyConfiguration } from 'nango';
import { User } from '../models.js';
import { z } from 'zod';

/**
 * Fetches user data from the DocuSign API and saves it in batches.
 */
const sync = createSync({
    description: 'Fetches a list of users from DocuSign',
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

    scopes: ['openid', 'signature'],

    models: {
        User: User
    },

    metadata: z.object({}),

    exec: async (nango) => {
        let totalRecords = 0;
        const { baseUri, accountId } = await getRequestInfo(nango);

        const proxyConfiguration: ProxyConfiguration = {
            baseUrlOverride: baseUri,
            // https://developers.docusign.com/docs/esign-rest-api/reference/users/users/list/ Valid values: 1 to 100
            endpoint: `/restapi/v2.1/accounts/${accountId}/users`, // excluding Closed (soft delete) and Disabled statuses
            params: {
                status: 'Active,ActivationRequired,ActivationSent'
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'start_position',
                limit_name_in_request: 'count',
                response_path: 'users',
                limit: 100
            }
        };

        for await (const docuSignUsers of nango.paginate(proxyConfiguration)) {
            const batchSize: number = docuSignUsers.length || 0;
            totalRecords += batchSize;

            const users: User[] = docuSignUsers.map(mapUser) || [];

            await nango.log(`Saving batch of ${batchSize} users (total users: ${totalRecords})`);

            await nango.batchSave(users, 'User');
        }
    await nango.deleteRecordsFromPreviousExecutions("User");
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;

/**
 * Maps a DocuSign object to a User object (Nango User type).
 */
function mapUser(user: DocuSignUser): User {
    return {
        id: user.userId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
    };
}
