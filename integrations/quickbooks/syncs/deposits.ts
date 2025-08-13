import { createSync } from 'nango';
import type { QuickBooksDeposit } from '../types.js';
import { paginate } from '../helpers/paginate.js';
import { toDeposit } from '../mappers/to-deposit.js';
import type { PaginationParams } from '../helpers/paginate.js';

import { Deposit } from '../models.js';
import { z } from 'zod';

const sync = createSync({
    description: 'Fetches all QuickBooks deposits',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    syncType: 'incremental',
    trackDeletes: false,

    endpoints: [
        {
            method: 'GET',
            path: '/deposits',
            group: 'Deposits'
        }
    ],

    scopes: ['com.intuit.quickbooks.accounting'],

    models: {
        Deposit: Deposit
    },

    metadata: z.object({}),

    exec: async (nango) => {
        const config: PaginationParams = {
            model: 'Deposit'
        };

        for await (const qDeposits of paginate<QuickBooksDeposit>(nango, config)) {
            const activeDeposits = qDeposits.filter((d) => d.status !== 'Deleted');
            const deletedDeposits = qDeposits.filter((d) => d.status === 'Deleted');

            if (activeDeposits.length > 0) {
                const mappedActiveDeposits = activeDeposits.map(toDeposit);
                await nango.batchSave(mappedActiveDeposits, 'Deposit');
                await nango.log(`Successfully saved ${activeDeposits.length} active deposits`);
            }

            if (nango.lastSyncDate && deletedDeposits.length > 0) {
                const mappedDeletedDeposits = deletedDeposits.map((deposit) => ({
                    id: deposit.Id
                }));
                await nango.batchDelete(mappedDeletedDeposits, 'Deposit');
                await nango.log(`Successfully processed ${deletedDeposits.length} deleted deposits`);
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
