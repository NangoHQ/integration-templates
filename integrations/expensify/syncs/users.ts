import type { NangoSync, ExpsensifyNullableUser, ProxyConfiguration } from '../../models';
import { getCredentials } from '../helpers/credentials.js';
import { getAdminPolicy } from '../helpers/policies.js';
import type { PolicyInfoResponse, ExpensifyEmployee } from '../types';

export default async function fetchData(nango: NangoSync): Promise<void> {
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
            id: user.employeeID || null,
            firstName: firstName || null,
            lastName: lastName || null,
            email: user.email
        };

        return outputUser;
    });

    await nango.batchSave(users, 'ExpsensifyNullableUser');
}
