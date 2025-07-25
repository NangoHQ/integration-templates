import { createSync } from "nango";
import type { QuickBooksCustomer } from '../types.js';
import { paginate } from '../helpers/paginate.js';
import { toCustomer } from '../mappers/to-customer.js';
import type { PaginationParams } from '../helpers/paginate.js';

import { Customer } from "../models.js";
import { z } from "zod";

/**
 * Fetches customer data from QuickBooks API and saves it in batch.
 * Handles both active and archived customers, saving or deleting them based on their status.
 * For detailed endpoint documentation, refer to:
 * https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/customer#query-a-customer
 *
 * @param nango The NangoSync instance used for making API calls and saving data.
 * @returns A promise that resolves when the data has been successfully fetched and saved.
 */
const sync = createSync({
    description: "Fetches all QuickBooks customers. Handles both active and archived customers, saving or deleting them based on their status.",
    version: "1.0.0",
    frequency: "every hour",
    autoStart: true,
    syncType: "incremental",
    trackDeletes: false,

    endpoints: [{
        method: "GET",
        path: "/customers",
        group: "Customers"
    }],

    scopes: ["com.intuit.quickbooks.accounting"],

    models: {
        Customer: Customer
    },

    metadata: z.object({}),

    exec: async nango => {
        const config: PaginationParams = {
            model: 'Customer',
            additionalFilter: 'Active IN (true, false)'
        };

        let allCustomers: QuickBooksCustomer[] = [];

        // Fetch all customers with pagination
        for await (const customers of paginate<QuickBooksCustomer>(nango, config)) {
            allCustomers = [...allCustomers, ...customers];
        }

        // Filter and process active customers
        const activeCustomers = allCustomers.filter((customer) => customer.Active);
        const mappedActiveCustomers = activeCustomers.map(toCustomer);
        await nango.batchSave(mappedActiveCustomers, 'Customer');

        // Handle archived customers only if it's an incremental refresh
        if (nango.lastSyncDate) {
            const archivedCustomers = allCustomers.filter((customer) => !customer.Active);
            const mappedArchivedCustomers = archivedCustomers.map(toCustomer);
            await nango.batchDelete(mappedArchivedCustomers, 'Customer');
        }
    }
});

export type NangoSyncLocal = Parameters<typeof sync["exec"]>[0];
export default sync;
