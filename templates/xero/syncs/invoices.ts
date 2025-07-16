import { createSync } from "nango";
import { getTenantId } from '../helpers/get-tenant-id.js';
import { toInvoice } from '../mappers/to-invoice.js';

import type { ProxyConfiguration } from "nango";
import { Invoice } from "../models.js";
import { z } from "zod";

interface Config extends ProxyConfiguration {
    params: Record<string, string | number>;
}

const sync = createSync({
    description: "Fetches all invoices in Xero. Incremental sync.",
    version: "1.0.3",
    frequency: "every hour",
    autoStart: true,
    syncType: "incremental",
    trackDeletes: false,

    endpoints: [{
        method: "GET",
        path: "/invoices",
        group: "Invoices"
    }],

    scopes: ["accounting.transactions"],

    models: {
        Invoice: Invoice
    },

    metadata: z.object({}),

    exec: async nango => {
        const tenant_id = await getTenantId(nango);

        const config: Config = {
            endpoint: 'api.xro/2.0/Invoices',
            headers: {
                'xero-tenant-id': tenant_id,
                'If-Modified-Since': ''
            },
            params: {
                page: 1,
                includeArchived: 'false'
            },
            retries: 10
        };

        await nango.log(`Last sync date - type: ${typeof nango.lastSyncDate} JSON value: ${JSON.stringify(nango.lastSyncDate)}`);

        if (nango.lastSyncDate && config.headers) {
            config.params['includeArchived'] = 'true';
            config.headers['If-Modified-Since'] = nango.lastSyncDate.toISOString().replace(/\.\d{3}Z$/, ''); // Returns yyyy-mm-ddThh:mm:ss
        }

        let page = 1;
        do {
            config.params['page'] = page;
            const res = await nango.get(config);
            const invoices = res.data.Invoices;

            const activeInvoices = invoices.filter((x: any) => x.Status !== 'DELETED' && x.Status !== 'VOIDED');
            const mappedActiveInvoices = activeInvoices.map(toInvoice);
            await nango.batchSave(mappedActiveInvoices, 'Invoice');

            if (nango.lastSyncDate) {
                const archivedInvoices = invoices.filter((x: any) => x.Status === 'DELETED' || x.Status === 'VOIDED');
                const mappedArchivedInvoices = archivedInvoices.map(toInvoice);
                await nango.batchDelete(mappedArchivedInvoices, 'Invoice');
            }

            // Should we still fetch the next page?
            page = invoices.length < 100 ? -1 : page + 1;
        } while (page != -1);
    }
});

export type NangoSyncLocal = Parameters<typeof sync["exec"]>[0];
export default sync;
