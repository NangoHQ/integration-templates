import { createSync } from 'nango';
import type { QuickBooksTransfer } from '../types.js';
import { paginate } from '../helpers/paginate.js';
import { toTransfer } from '../mappers/to-transfer.js';
import type { PaginationParams } from '../helpers/paginate.js';

import { Transfer } from '../models.js';
import { z } from 'zod';

const sync = createSync({
    description: 'Fetches all QuickBooks transfers',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    syncType: 'incremental',
    trackDeletes: false,

    endpoints: [
        {
            method: 'GET',
            path: '/transfers',
            group: 'Transfers'
        }
    ],

    scopes: ['com.intuit.quickbooks.accounting'],

    models: {
        Transfer: Transfer
    },

    metadata: z.object({}),

    exec: async (nango) => {
        const config: PaginationParams = {
            model: 'Transfer'
        };

        for await (const qTransfers of paginate<QuickBooksTransfer>(nango, config)) {
            const activeTransfers = qTransfers.filter((transfer) => transfer.status !== 'Deleted');
            const deletedTransfers = qTransfers.filter((transfer) => transfer.status === 'Deleted');

            // Process and save active transfers
            if (activeTransfers.length > 0) {
                const mappedActiveTransfers = activeTransfers.map(toTransfer);
                await nango.batchSave(mappedActiveTransfers, 'Transfer');
            }

            // Process deletions if this is not the first sync
            if (nango.lastSyncDate && deletedTransfers.length > 0) {
                const mappedDeletedTransfers = deletedTransfers.map((transfer) => ({
                    id: transfer.Id
                }));
                await nango.batchDelete(mappedDeletedTransfers, 'Transfer');
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
