import { createSync } from 'nango';
import type { QuickBooksBillPayment } from '../types.js';
import { paginate } from '../helpers/paginate.js';
import { toBillPayment } from '../mappers/to-bill-payment.js';
import type { PaginationParams } from '../helpers/paginate.js';

import { BillPayment } from '../models.js';
import { z } from 'zod';

const sync = createSync({
    description: 'Fetches all QuickBooks bill payments',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    syncType: 'incremental',

    endpoints: [
        {
            method: 'GET',
            path: '/bill-payments',
            group: 'Bill Payments'
        }
    ],

    scopes: ['com.intuit.quickbooks.accounting'],

    models: {
        BillPayment: BillPayment
    },

    metadata: z.object({}),

    exec: async (nango) => {
        const config: PaginationParams = {
            model: 'BillPayment'
        };

        for await (const qBillPayments of paginate<QuickBooksBillPayment>(nango, config)) {
            const activeBillPayments = qBillPayments.filter((payment) => !payment.PrivateNote?.includes('Voided') && payment.status !== 'Deleted');
            const deletedBillPayments = qBillPayments.filter((payment) => payment.PrivateNote?.includes('Voided') || payment.status === 'Deleted');

            if (activeBillPayments.length > 0) {
                const mappedActiveBillPayments = activeBillPayments.map(toBillPayment);
                await nango.batchSave(mappedActiveBillPayments, 'BillPayment');
                await nango.log(`Successfully saved ${activeBillPayments.length}  bill payments`);
            }

            // Handle deleted or voided bill payments if this isn't the first sync
            if (nango.lastSyncDate && deletedBillPayments.length > 0) {
                const mappedDeletedBillPayments = deletedBillPayments.map((payment) => ({
                    id: payment.Id
                }));
                await nango.batchDelete(mappedDeletedBillPayments, 'BillPayment');
                await nango.log(`Successfully processed ${deletedBillPayments.length} bill payments`);
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
