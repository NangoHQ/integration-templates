import { createSync } from "nango";
import type { NS_Payment, NSAPI_GetResponse } from '../types.js';
import { paginate } from '../helpers/pagination.js';
import { formatDate } from '../helpers/utils.js';

import type { ProxyConfiguration } from "nango";
import { NetsuitePayment, NetsuiteMetadata } from "../models.js";

const retries = 3;

const sync = createSync({
    description: "Fetches all payments received from customers in Netsuite",
    version: "2.0.0",
    frequency: "every hour",
    autoStart: false,
    syncType: "incremental",
    trackDeletes: false,

    endpoints: [{
        method: "GET",
        path: "/payments",
        group: "Payments"
    }],

    models: {
        NetsuitePayment: NetsuitePayment
    },

    metadata: NetsuiteMetadata,

    exec: async nango => {
        const lastModifiedDateQuery = nango.lastSyncDate ? `lastModifiedDate ON_OR_AFTER "${await formatDate(nango.lastSyncDate, nango)}"` : undefined;

        const proxyConfig: ProxyConfiguration = {
            // https://system.netsuite.com/help/helpcenter/en_US/APIs/REST_API_Browser/record/v1/2022.1/index.html#tag-customerPayment
            endpoint: '/customerpayment',
            retries,
            ...(lastModifiedDateQuery ? { params: { q: lastModifiedDateQuery } } : {})
        };
        for await (const payments of paginate<{ id: string }>({ nango, proxyConfig })) {
            await nango.log('Listed payments', { total: payments.length });

            const mappedPayments: NetsuitePayment[] = [];
            for (const paymentLink of payments) {
                const payment: NSAPI_GetResponse<NS_Payment> = await nango.get({
                    endpoint: `/customerpayment/${paymentLink.id}`,
                    params: {
                        expandSubResources: 'true'
                    },
                    retries
                });
                if (!payment.data) {
                    await nango.log('Payment not found', { id: paymentLink.id });
                    continue;
                }
                const mappedPayment: NetsuitePayment = {
                    id: payment.data.id,
                    createdAt: payment.data.tranDate || null,
                    customerId: payment.data.customer?.id || null,
                    amount: payment.data.payment ? Number(payment.data.payment) : 0,
                    currency: payment.data.currency?.refName || null,
                    paymentReference: payment.data.tranId || null,
                    status: payment.data.status?.id || null,
                    applyTo: payment.data.apply?.items.map((item) => item.doc.id) || []
                };
                if (payment.data.memo) {
                    mappedPayment.description = payment.data.memo;
                }
                mappedPayments.push(mappedPayment);
            }

            await nango.batchSave(mappedPayments, 'NetsuitePayment');
        }
    }
});

export type NangoSyncLocal = Parameters<typeof sync["exec"]>[0];
export default sync;
