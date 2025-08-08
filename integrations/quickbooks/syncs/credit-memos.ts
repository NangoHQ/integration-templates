import { createSync } from "nango";
import type { QuickBooksCreditMemo } from '../types.js';
import { paginate } from '../helpers/paginate.js';
import { toCreditMemo } from '../mappers/to-credit-memo.js';
import type { PaginationParams } from '../helpers/paginate.js';

import { CreditMemo } from "../models.js";
import { z } from "zod";

const sync = createSync({
    description: "Fetches all QuickBooks credit memos",
    version: "1.0.0",
    frequency: "every hour",
    autoStart: true,
    syncType: "incremental",
    trackDeletes: false,

    endpoints: [{
        method: "GET",
        path: "/credit-memos",
        group: "Credit Memos"
    }],

    scopes: ["com.intuit.quickbooks.accounting"],

    models: {
        CreditMemo: CreditMemo
    },

    metadata: z.object({}),

    exec: async nango => {
        const config: PaginationParams = {
            model: 'CreditMemo'
        };

        for await (const qCreditMemos of paginate<QuickBooksCreditMemo>(nango, config)) {
            const activeCreditMemos = qCreditMemos.filter((memo) => memo.status !== 'Deleted');
            const deletedCreditMemos = qCreditMemos.filter((memo) => memo.status === 'Deleted');

            if (activeCreditMemos.length > 0) {
                const mappedActiveCreditMemos = activeCreditMemos.map(toCreditMemo);
                await nango.batchSave(mappedActiveCreditMemos, 'CreditMemo');
                await nango.log(`Successfully saved ${activeCreditMemos.length} active credit memos`);
            }

            if (deletedCreditMemos.length > 0 && nango.lastSyncDate) {
                const mappedDeletedCreditMemos = deletedCreditMemos.map((memo) => ({
                    id: memo.Id
                }));
                await nango.batchDelete(mappedDeletedCreditMemos, 'CreditMemo');
                await nango.log(`Successfully processed ${deletedCreditMemos.length} deleted credit memos`);
            }
        }
    }
});

export type NangoSyncLocal = Parameters<typeof sync["exec"]>[0];
export default sync;
