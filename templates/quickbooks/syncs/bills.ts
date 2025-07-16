import { createSync } from "nango";
import type { QuickBooksBill } from '../types.js';
import { paginate } from '../helpers/paginate.js';
import { toBill } from '../mappers/to-bill.js';
import type { PaginationParams } from '../helpers/paginate.js';

import { Bill } from "../models.js";
import { z } from "zod";

const sync = createSync({
    description: "Fetches all QuickBooks bills",
    version: "0.0.1",
    frequency: "every hour",
    autoStart: true,
    syncType: "incremental",
    trackDeletes: false,

    endpoints: [{
        method: "GET",
        path: "/bills",
        group: "Bills"
    }],

    scopes: ["com.intuit.quickbooks.accounting"],

    models: {
        Bill: Bill
    },

    metadata: z.object({}),

    exec: async nango => {
        const config: PaginationParams = {
            model: 'Bill'
        };

        for await (const qBills of paginate<QuickBooksBill>(nango, config)) {
            // Split active and deleted bills
            const activeBills = qBills.filter((bill) => bill.status !== 'Deleted');
            const deletedBills = qBills.filter((bill) => bill.status === 'Deleted');

            if (activeBills.length > 0) {
                const mappedActiveBills = activeBills.map(toBill);
                await nango.batchSave(mappedActiveBills, 'Bill');
                await nango.log(`Successfully saved ${activeBills.length} active bills`);
            }

            // Handle deleted bills if this isn't the first sync
            if (nango.lastSyncDate && deletedBills.length > 0) {
                const mappedDeletedBills = deletedBills.map((bill) => ({
                    id: bill.Id
                }));
                await nango.batchDelete(mappedDeletedBills, 'Bill');
                await nango.log(`Successfully processed ${deletedBills.length} deleted bills`);
            }
        }
    }
});

export type NangoSyncLocal = Parameters<typeof sync["exec"]>[0];
export default sync;
