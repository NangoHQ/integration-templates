import type { NangoSync, Account, ProxyConfiguration } from '../../models';
import { buildQuery } from '../utils.js';
import type { SalesforceAccount } from '../types';
import { toAccount } from '../mappers/toAccount.js';

export default async function fetchData(nango: NangoSync) {
    const fields = [
        'Id',
        'Name',
        'Description',
        'Website',
        'Industry',
        'BillingCity',
        'BillingCountry',
        'OwnerId',
        'Owner.Name',
        'NumberOfEmployees',
        'LastModifiedDate'
    ];
    const query = buildQuery('Account', fields, nango.lastSyncDate);

    await fetchAndSaveRecords(nango, query);
}

async function fetchAndSaveRecords(nango: NangoSync, query: string) {
    const endpoint = '/services/data/v60.0/query';

    const proxyConfig: ProxyConfiguration = {
        // https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/dome_query.htm
        endpoint,
        retries: 10,
        params: { q: query },
        paginate: {
            type: 'link',
            response_path: 'records',
            link_path_in_response_body: 'nextRecordsUrl'
        }
    };

    for await (const accounts of nango.paginate<SalesforceAccount>(proxyConfig)) {
        const mappedAccounts = accounts.map((account: SalesforceAccount) => toAccount(account));
        await nango.batchSave<Account>(mappedAccounts, 'Account');
    }
}
