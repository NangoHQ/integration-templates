import type { NangoAction, NangoSync } from '../../models.js';
import type { UserInfoResponse, AccountInfo } from '../types.js';

/**
 * Retrieves the base URI and account ID of the default account associated with the
 * logged-in user from the DocuSign API.
 */
export async function getRequestInfo(nango: NangoAction | NangoSync): Promise<{ baseUri: string; accountId: string }> {
    const rootUrl = nango.providerConfigKey.includes('sandbox') ? 'account-d.docusign.com' : 'account.docusign.com';
    const response = await nango.get<UserInfoResponse>({
        // https://developers.docusign.com/platform/auth/reference/user-info/
        baseUrlOverride: `https://${rootUrl}`,
        endpoint: '/oauth/userinfo',
        retries: 10
    });

    if (response.data.accounts.length <= 0) {
        throw new nango.ActionError({ message: 'failed to get request info' });
    }

    // There could be multiple accounts tied to the user. Use the default account.
    const defaultAccount = response.data.accounts.find((account: AccountInfo) => account.is_default);

    if (!defaultAccount) {
        throw new nango.ActionError({ message: 'failed to get DocuSign default account' });
    }

    await nango.log(`Got default DocuSign account`);

    return {
        baseUri: defaultAccount.base_uri,
        accountId: defaultAccount.account_id
    };
}
