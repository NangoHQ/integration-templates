import { createSync } from "nango";
import { toInvoice } from '../mappers/to-invoice.js';

import type { ProxyConfiguration } from "nango";
import { PennylaneInvoice } from "../models.js";
import { z } from "zod";

const sync = createSync({
    description: "Fetches a list of customer invoices from pennylane",
    version: "2.0.0",
    frequency: "every 6 hours",
    autoStart: true,
    syncType: "incremental",
    trackDeletes: false,

    endpoints: [{
        method: "GET",
        path: "/invoices",
        group: "Invoices"
    }],

    scopes: ["customer_invoices"],

    models: {
        PennylaneInvoice: PennylaneInvoice
    },

    metadata: z.object({}),

    exec: async nango => {
        const config: ProxyConfiguration = {
            // https://pennylane.readme.io/reference/customer_invoices-get-1
            endpoint: '/api/external/v1/customer_invoices',
            retries: 10,
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                response_path: 'invoices'
            }
        };

        if (nango.lastSyncDate) {
            config.params = {
                filter: JSON.stringify([
                    {
                        field: 'updated_at',
                        operator: 'gteq',
                        value: nango.lastSyncDate.toISOString()
                    }
                ])
            };
        }

        for await (const response of nango.paginate<PennylaneInvoice>(config)) {
            const invoices = response.map(toInvoice);
            await nango.batchSave(invoices, 'PennylaneInvoice');
        }
    }
});

export type NangoSyncLocal = Parameters<typeof sync["exec"]>[0];
export default sync;
