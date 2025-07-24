import { createSync } from "nango";
import type { NS_Invoice, NSAPI_GetResponse } from '../types.js';
import { paginate } from '../helpers/pagination.js';
import { formatDate } from '../helpers/utils.js';

import type { ProxyConfiguration } from "nango";
import type { NetsuiteInvoiceLine} from "../models.js";
import { NetsuiteInvoice, NetsuiteMetadata } from "../models.js";

const retries = 3;

const sync = createSync({
    description: "Fetches all invoices in Netsuite",
    version: "1.0.2",
    frequency: "every hour",
    autoStart: false,
    syncType: "incremental",
    trackDeletes: false,

    endpoints: [{
        method: "GET",
        path: "/invoices",
        group: "Invoices"
    }],

    models: {
        NetsuiteInvoice: NetsuiteInvoice
    },

    metadata: NetsuiteMetadata,

    exec: async nango => {
        const lastModifiedDateQuery = nango.lastSyncDate ? `lastModifiedDate ON_OR_AFTER "${await formatDate(nango.lastSyncDate, nango)}"` : undefined;

        const proxyConfig: ProxyConfiguration = {
            // https://system.netsuite.com/help/helpcenter/en_US/APIs/REST_API_Browser/record/v1/2022.1/index.html#tag-invoice
            endpoint: '/invoice',
            retries,
            ...(lastModifiedDateQuery ? { params: { q: lastModifiedDateQuery } } : {})
        };
        for await (const invoices of paginate<{ id: string }>({ nango, proxyConfig })) {
            await nango.log('Listed invoices', { total: invoices.length });

            const mappedInvoices: NetsuiteInvoice[] = [];
            for (const invoiceLink of invoices) {
                const invoice: NSAPI_GetResponse<NS_Invoice> = await nango.get({
                    endpoint: `/invoice/${invoiceLink.id}`,
                    params: {
                        expandSubResources: 'true'
                    },
                    retries
                });
                if (!invoice.data) {
                    await nango.log('Invoice not found', { id: invoiceLink.id });
                    continue;
                }
                const mappedInvoice: NetsuiteInvoice = {
                    id: invoice.data.id,
                    customerId: invoice.data.entity?.id || '',
                    currency: invoice.data.currency?.refName || '',
                    description: invoice.data.memo || null,
                    createdAt: invoice.data.tranDate || '',
                    lines: [],
                    total: invoice.data.total ? Number(invoice.data.total) : 0,
                    status: invoice.data.status?.id || ''
                };

                for (const item of invoice.data.item.items) {
                    const line: NetsuiteInvoiceLine = {
                        itemId: item.item?.id || '',
                        quantity: item.quantity ? Number(item.quantity) : 0,
                        amount: item.amount ? Number(item.amount) : 0
                    };
                    if (item.taxDetailsReference) {
                        line.vatCode = item.taxDetailsReference;
                    }
                    if (item.item?.refName) {
                        line.description = item.item?.refName;
                    }
                    mappedInvoice.lines.push(line);
                }

                mappedInvoices.push(mappedInvoice);
            }

            await nango.batchSave(mappedInvoices, 'NetsuiteInvoice');
        }
    }
});

export type NangoSyncLocal = Parameters<typeof sync["exec"]>[0];
export default sync;
