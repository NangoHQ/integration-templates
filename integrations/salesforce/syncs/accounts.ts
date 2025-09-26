import { createSync } from 'nango';
import { buildQuery } from '../utils.js';
import type { SalesforceAccount } from '../types.js';
import { toAccount } from '../mappers/toAccount.js';

import type { ProxyConfiguration } from 'nango';
import { Account } from '../models.js';
import { z } from 'zod';

const sync = createSync({
    description: 'Fetches a list of accounts from salesforce',
    version: '2.0.0',
    frequency: 'every hour',
    autoStart: true,
    syncType: 'incremental',

    endpoints: [
        {
            method: 'GET',
            path: '/accounts',
            group: 'Accounts'
        }
    ],

    models: {
        Account: Account
    },

    metadata: z.object({}),

    exec: async (nango) => {
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
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;

async function fetchAndSaveRecords(nango: NangoSyncLocal, query: string) {
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
        await nango.batchSave(mappedAccounts, 'Account');
    }
}
