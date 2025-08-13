import { createSync } from 'nango';
import type { QuickBooksPurchase } from '../types.js';
import { paginate } from '../helpers/paginate.js';
import { toPurchase } from '../mappers/to-purchase.js';
import type { PaginationParams } from '../helpers/paginate.js';

import { Purchase } from '../models.js';
import { z } from 'zod';

const sync = createSync({
    description: 'Fetches all QuickBooks purchases',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    syncType: 'incremental',
    trackDeletes: false,

    endpoints: [
        {
            method: 'GET',
            path: '/purchases',
            group: 'Purchases'
        }
    ],

    scopes: ['com.intuit.quickbooks.accounting'],

    models: {
        Purchase: Purchase
    },

    metadata: z.object({}),

    exec: async (nango) => {
        const config: PaginationParams = {
            model: 'Purchase'
        };

        for await (const qPurchases of paginate<QuickBooksPurchase>(nango, config)) {
            const activePurchases = qPurchases.filter((purchase) => purchase.status !== 'Deleted');
            const deletedPurchases = qPurchases.filter((purchase) => purchase.status === 'Deleted');

            // Process and save active purchases
            if (activePurchases.length > 0) {
                const mappedActivePurchases = activePurchases.map(toPurchase);
                await nango.batchSave(mappedActivePurchases, 'Purchase');
            }

            // Process deletions if this is not the first sync
            if (nango.lastSyncDate && deletedPurchases.length > 0) {
                const mappedDeletedPurchases = deletedPurchases.map((purchase) => ({
                    id: purchase.Id
                }));
                await nango.batchDelete(mappedDeletedPurchases, 'Purchase');
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
