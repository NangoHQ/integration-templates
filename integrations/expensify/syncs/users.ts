import { createSync } from 'nango';
import { getCredentials } from '../helpers/credentials.js';
import { getAdminPolicy } from '../helpers/policies.js';
import type { PolicyInfoResponse, ExpensifyEmployee } from '../types.js';

import type { ProxyConfiguration } from 'nango';
import { ExpsensifyNullableUser } from '../models.js';
import { z } from 'zod';

const sync = createSync({
    description: 'Fetches a list of users from Expensify.',
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

    models: {
        ExpsensifyNullableUser: ExpsensifyNullableUser
    },

    metadata: z.object({}),

    exec: async (nango) => {
        const credentials = await getCredentials(nango);
        const policy = await getAdminPolicy(nango);

        const { id: adminPolicyId } = policy;

        const config: ProxyConfiguration = {
            // https://integrations.expensify.com/Integration-Server/doc/#policy-getter
            endpoint: `/ExpensifyIntegrations`,
            data:
                'requestJobDescription=' +
                encodeURIComponent(
                    JSON.stringify({
                        type: 'get',
                        credentials,
                        inputSettings: {
                            type: 'policy',
                            fields: ['employees'],
                            policyIDList: [adminPolicyId]
                        }
                    })
                ),
            retries: 10
        };

        const request = await nango.post<PolicyInfoResponse>(config);

        const { data } = request;

        const employees = data.policyInfo[adminPolicyId]?.employees || [];

        const users: ExpsensifyNullableUser[] = employees.map((user: ExpensifyEmployee) => {
            const [firstName, lastName] = user.customField2?.split(' ') || [null, null];
            const outputUser: ExpsensifyNullableUser = {
                id: user.employeeID || '',
                firstName: firstName || null,
                lastName: lastName || null,
                email: user.email
            };

            return outputUser;
        });

        await nango.batchSave(users, 'ExpsensifyNullableUser');

        await nango.deleteRecordsFromPreviousExecutions("ExpsensifyNullableUser");
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
