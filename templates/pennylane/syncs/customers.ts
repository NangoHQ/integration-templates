import { createSync } from "nango";
import { toCustomer } from '../mappers/to-customer.js';

import type { ProxyConfiguration } from "nango";
import { PennylaneCustomer, PennylaneIndividualCustomer } from "../models.js";
import { z } from "zod";

const sync = createSync({
    description: "Fetches a list of customers from pennylane",
    version: "1.0.1",
    frequency: "every 6 hours",
    autoStart: true,
    syncType: "incremental",
    trackDeletes: false,

    endpoints: [{
        method: "GET",
        path: "/customers",
        group: "Customers"
    }],

    scopes: ["accounting"],

    models: {
        PennylaneCustomer: PennylaneCustomer
    },

    metadata: z.object({}),

    exec: async nango => {
        const config: ProxyConfiguration = {
            // https://pennylane.readme.io/reference/customers-get-1
            endpoint: `/api/external/v1/customers`,
            retries: 10,
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                response_path: 'customers'
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

        for await (const response of nango.paginate<PennylaneIndividualCustomer>(config)) {
            const customers = response.map(toCustomer);
            await nango.batchSave(customers, 'PennylaneCustomer');
        }
    }
});

export type NangoSyncLocal = Parameters<typeof sync["exec"]>[0];
export default sync;
