import { createSync } from "nango";
import type { WooCommerceCustomer } from '../types.js';
import { toCustomer } from '../mappers/to-customer.js';

import type { ProxyConfiguration } from "nango";
import { Customer } from "../models.js";
import { z } from "zod";

/**
 * Retrieves WooCommerce customers from the API, transforms the data into a suitable format,
 * and saves the processed customers using NangoSync. This function handles pagination to ensure
 * that all customers are fetched, converted, and stored correctly.
 *
 * For detailed endpoint documentation, refer to:
 * https://woocommerce.github.io/woocommerce-rest-api-docs/#list-all-customers
 *
 * @param nango - An instance of NangoSync for managing API interactions and processing.
 * @returns A Promise that resolves when all customers have been successfully fetched and saved.
 */
const sync = createSync({
    description: "Periodically fetches all the Woo customers.",
    version: "0.0.1",
    frequency: "every day",
    autoStart: true,
    syncType: "full",
    trackDeletes: true,

    endpoints: [{
        method: "GET",
        path: "/customers"
    }],

    scopes: ["read"],

    models: {
        Customer: Customer
    },

    metadata: z.object({}),

    exec: async nango => {
        const config: ProxyConfiguration = {
            // https://woocommerce.github.io/woocommerce-rest-api-docs/#list-all-customers
            endpoint: '/wp-json/wc/v3/customers',
            retries: 10,
            paginate: {
                type: 'offset',
                limit: 100,
                offset_name_in_request: 'offset',
                limit_name_in_request: 'per_page'
            }
        };

        for await (const customers of nango.paginate<WooCommerceCustomer>(config)) {
            await nango.batchSave(customers.map(toCustomer), 'Customer');
        }
    }
});

export type NangoSyncLocal = Parameters<typeof sync["exec"]>[0];
export default sync;
