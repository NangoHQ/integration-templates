import type { Account, NangoSync, ProxyConfiguration } from '../../models';
import { toAccount } from '../mappers/to-account.js';
import type { GeneralLedgerAccount, GeneralLedgerAccountResponse, GeneralLedgerAccountSummary } from '../types';

export default async function fetchData(nango: NangoSync): Promise<void> {
    const config: ProxyConfiguration = {
        // https://developer.sage.com/intacct/docs/openapi/gl/general-ledger.account/tag/Accounts/#tag/Accounts/operation/list-general-ledger-account
        endpoint: '/v1/objects/general-ledger/account',
        paginate: {
            type: 'offset',
            offset_name_in_request: 'ia::meta.next',
            response_path: 'a::result',
            limit_name_in_request: 'limit',
            limit: 100
        }
    };

    for await (const accounts of nango.paginate<GeneralLedgerAccountSummary>(config)) {
        const accountIds: string[] = accounts.map((account) => account.id).filter(Boolean);

        for (const accountId of accountIds) {
            const accountDetails = await fetchAccountDetails(nango, accountId);
            if (accountDetails) {
                const mappedAccount: Account = toAccount(accountDetails);
                await nango.batchSave([mappedAccount], 'Account');
            }
        }
    }
}

async function fetchAccountDetails(nango: NangoSync, accountId: string): Promise<GeneralLedgerAccount> {
    const config: ProxyConfiguration = {
        // https://developer.sage.com/intacct/docs/openapi/gl/general-ledger.account/tag/Accounts/#tag/Accounts/operation/get-general-ledger-account-key
        endpoint: `v1/objects/general-ledger/account/${accountId}`,
        retries: 10
    };
    const response = await nango.get<GeneralLedgerAccountResponse>(config);

    return response.data['ia::result'];
}
