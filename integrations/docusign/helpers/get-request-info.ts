import type { NangoAction } from '../../models';
import type { UserInfoResponse } from '../types';

/**
 * Retrieves the base URI and account ID of the default account associated with the
 * logged-in user from the DocuSign API.
 */
export async function getRequestInfo(nango: NangoAction): Promise<{ baseUri: string; accountId: string }> {
    const response = await nango.get<UserInfoResponse>({
        // https://developers.docusign.com/platform/auth/reference/user-info/
        baseUrlOverride: `https://account.docusign.com`,
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
        throw new nango.ActionError({ message: 'failed to get DocuSign default account' });
    }

    await nango.log(`Got default DocuSign account`);

    return {
        baseUri: defaultAccount.base_uri,
        accountId: defaultAccount.account_id
    };
}
