import type { NangoAction, Account } from '../../models.js';
import type { ClickSendAccount } from '../types.js';
import { toAccount } from '../mappers/to-account.js';

export default async function runAction(nango: NangoAction, _input?: void): Promise<Account> {
    const response = await nango.get<{ data: ClickSendAccount }>({
        // https://developers.clicksend.com/docs/accounts/management/other/view-account-details
        endpoint: '/v3/account',
        retries: 3
    });

    const clickSendAccount = response.data.data;

    return toAccount(clickSendAccount);
}
