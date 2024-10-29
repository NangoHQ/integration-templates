import type { NangoAction, NangoSync } from '../../models';
import { getCredentials } from '../helpers/credentials.js';
import type { PolicyListResponse, ExpensifyPolicy } from '../types';

export async function getPolicies(nango: NangoSync | NangoAction): Promise<PolicyListResponse> {
    const credentials = await getCredentials(nango);

    const postData =
        'requestJobDescription=' +
        encodeURIComponent(
            JSON.stringify({
                type: 'get',
                credentials,
                inputSettings: {
                    type: 'policyList'
                }
            })
        );

    const resp = await nango.post<PolicyListResponse>({
        // https://integrations.expensify.com/Integration-Server/doc/#policy-list-getter
        endpoint: `/ExpensifyIntegrations`,
        data: postData,
        retries: 10
    });

    return resp.data;
}

export async function getAdminPolicy(nango: NangoSync | NangoAction): Promise<ExpensifyPolicy> {
    const { policyList } = await getPolicies(nango);
    const defaultPolicy = policyList.find((policy: ExpensifyPolicy) => policy.role === 'admin');

    if (!defaultPolicy) {
        throw new nango.ActionError({
            message: `No admin policy found`
        });
    }

    return defaultPolicy;
}
