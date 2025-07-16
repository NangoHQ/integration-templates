import { createSync } from "nango";
import type { WooCommerceOrder } from '../types.js';
import { toOrder } from '../mappers/to-order.js';

import type { ProxyConfiguration } from "nango";
import { Order } from "../models.js";
import { z } from "zod";

/**
 * Retrieves WooCommerce orders from the API, transforms the data into a suitable format,
 * and saves the processed orders using NangoSync. This function handles pagination to ensure
 * that all orders are fetched, converted, and stored correctly.
 *
 * For detailed endpoint documentation, refer to:
 * https://woocommerce.github.io/woocommerce-rest-api-docs/#list-all-orders
 *
 * @param nango - An instance of NangoSync for managing API interactions and processing.
 * @returns A Promise that resolves when all orders have been successfully fetched and saved.
 */
const sync = createSync({
    description: "Periodically fetches all the Woo orders.",
    version: "0.0.1",
    frequency: "every 5 minutes",
    autoStart: true,
    syncType: "incremental",
    trackDeletes: false,

    endpoints: [{
        method: "GET",
        path: "/orders"
    }],

    scopes: ["read"],

    models: {
        Order: Order
    },

    metadata: z.object({}),

    exec: async nango => {
        const config: ProxyConfiguration = {
            // https://woocommerce.github.io/woocommerce-rest-api-docs/#list-all-orders
            endpoint: '/wp-json/wc/v3/orders',
            retries: 10,
            params: nango.lastSyncDate
                ? {
                      modified_after: nango.lastSyncDate.toISOString(),
                      dates_are_gmt: 'true'
                  }
                : { dates_are_gmt: 'true' },
            paginate: {
                type: 'offset',
                limit: 100,
                offset_name_in_request: 'offset',
                limit_name_in_request: 'per_page'
            }
        };

        for await (const orders of nango.paginate<WooCommerceOrder>(config)) {
            await nango.batchSave(orders.map(toOrder), 'Order');
        }
    }
});

export type NangoSyncLocal = Parameters<typeof sync["exec"]>[0];
export default sync;
