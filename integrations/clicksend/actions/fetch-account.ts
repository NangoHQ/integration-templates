import type { NangoAction, Account } from '../../models';
import type { ClickSendAccount } from '../types.js';
import { toAccount } from '../mappers/to-account.js';

export default async function runAction(nango: NangoAction, _input?: void): Promise<Account> {
    // https://developers.clicksend.com/docs/accounts/management/other/view-account-details
    const response = await nango.proxy({
        endpoint: '/account',
        method: 'GET',
        retries: 3
    });

    const clickSendAccount: ClickSendAccount = response.data.data;

    return toAccount(clickSendAccount);
}
