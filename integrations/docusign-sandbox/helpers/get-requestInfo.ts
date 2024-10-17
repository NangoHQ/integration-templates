import type { NangoAction } from '../../models';
import { UserInfoResponse } from '../types';

// TODO: documentation
export async function getRequestInfo(nango: NangoAction): Promise<{ baseUri: string; accountId: string }> {
    const response = await nango.get<UserInfoResponse>({
        baseUrlOverride: `https://account-d.docusign.com`,
        endpoint: '/oauth/userinfo',
        headers: { accept: 'application/json' },
        retries: 10
    });

    if (response.data.accounts.length <= 0) {
        throw new nango.ActionError({ message: 'failed to get request info' });
    }

    // There could be multiple accounts tied to the user. Use the default account.
    const defaultAccount = response.data.accounts.find((account) => account.is_default);

    if (!defaultAccount) {
        throw new nango.ActionError({ message: 'failed to get DocuSign Sandbox default account' });
    }

    await nango.log(`Got default DocuSign Sandbox account`);

    return {
        baseUri: defaultAccount.base_uri,
        accountId: defaultAccount.account_id
    };
}
