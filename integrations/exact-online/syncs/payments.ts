import { createSync } from 'nango';
import type { EO_Payment } from '../types.js';
import { getUser } from '../helpers/get-user.js';

import { ExactPayment } from '../models.js';
import { z } from 'zod';

const sync = createSync({
    description: 'Fetches all payments in Exact Online',
    version: '2.0.0',
    frequency: 'every hour',
    autoStart: true,
    syncType: 'full',
    trackDeletes: true,

    endpoints: [
        {
            method: 'GET',
            path: '/payments'
        }
    ],

    models: {
        ExactPayment: ExactPayment
    },

    metadata: z.object({}),

    exec: async (nango) => {
        const { division } = await getUser(nango);

        // List the accounts inside the user's Division
        for await (const paymentItems of nango.paginate<EO_Payment>({
            endpoint: `/api/v1/${division}/crm/Payments`,
            headers: { accept: 'application/json' },
            paginate: { response_path: 'd.results' },
            retries: 10
        })) {
            await nango.log('Listed', { total: paymentItems.length });

            const payments = paymentItems.map<ExactPayment>((payment) => {
                const tmp: ExactPayment = {
                    id: payment.ID,
                    description: payment.Description,
                    division: payment.Division,
                    customerId: payment.Account,
                    amount: payment.AmountFC,
                    createdAt: payment.Created,
                    currency: payment.Currency,
                    journal: payment.Journal,
                    paymentMethod: payment.PaymentMethod,
                    paymentReference: payment.PaymentReference,
                    status: payment.Status,
                    transactionID: payment.TransactionID
                };
                return tmp;
            });
            await nango.batchSave(payments, 'ExactPayment');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
