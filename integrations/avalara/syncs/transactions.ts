import { createSync } from 'nango';
import { getCompany } from '../helpers/get-company.js';

import type { ProxyConfiguration } from 'nango';
import { Transaction, ConnectionMetadata } from '../models.js';

const DEFAULT_BACKFILL_MS = 365 * 24 * 60 * 60 * 1000;

const sync = createSync({
    description: 'List all transactions with a default backfill date of one year.',
    version: '2.0.0',
    frequency: 'every hour',
    autoStart: true,
    syncType: 'full',
    trackDeletes: false,

    endpoints: [
        {
            method: 'GET',
            path: '/transactions',
            group: 'Transactions'
        }
    ],

    models: {
        Transaction: Transaction
    },

    metadata: ConnectionMetadata,

    exec: async (nango) => {
        const company = await getCompany(nango);

        let dateFilter: string | undefined = '';

        if (nango.lastSyncDate) {
            dateFilter = nango.lastSyncDate.toISOString().split('T')[0];
        } else {
            const metadata = await nango.getMetadata();
            const backfillMilliseconds = metadata?.backfillPeriodMs || DEFAULT_BACKFILL_MS;
            dateFilter = new Date(Date.now() - backfillMilliseconds).toISOString().split('T')[0];
        }

        const config: ProxyConfiguration = {
            baseUrlOverride: `https://${nango.provider === 'avalara' ? '' : 'sandbox-'}rest.avatax.com/`,
            // https://developer.avalara.com/api-reference/avatax/rest/v2/methods/Transactions/ListTransactionsByCompany/
            endpoint: `/api/v2/companies/${company}/transactions`,
            params: {
                $filter: `date >= ${dateFilter}`
            },
            paginate: {
                type: 'link',
                link_path_in_response_body: '@nextLink',
                response_path: 'value'
            },
            retries: 10
        };

        for await (const avalaraTransactions of nango.paginate(config)) {
            const transactions: Transaction[] = avalaraTransactions.map((avalaraTransaction) => {
                return {
                    ...avalaraTransaction,
                    id: avalaraTransaction.id.toString()
                };
            });

            await nango.batchSave(transactions, 'Transaction');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
