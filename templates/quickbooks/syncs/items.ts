import { createSync } from "nango";
import type { QuickBooksItem } from '../types.js';
import { paginate } from '../helpers/paginate.js';
import { toItem } from '../mappers/to-item.js';
import type { PaginationParams } from '../helpers/paginate.js';

import { Item } from "../models.js";
import { z } from "zod";

/**
 * Fetches item data from QuickBooks API and saves it in batch.
 * Handles both active and archived items, saving or deleting them based on their status.
 * For detailed endpoint documentation, refer to:
 * https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/item#query-an-item
 *
 * @param nango The NangoSync instance used for making API calls and saving data.
 * @returns A promise that resolves when the data has been successfully fetched and saved.
 */
const sync = createSync({
    description: "Fetches all items in QuickBooks. Handles both active and archived items, saving or deleting them based on their status.",
    version: "0.0.1",
    frequency: "every hour",
    autoStart: true,
    syncType: "incremental",
    trackDeletes: false,

    endpoints: [{
        method: "GET",
        path: "/items",
        group: "Items"
    }],

    scopes: ["com.intuit.quickbooks.accounting"],

    models: {
        Item: Item
    },

    metadata: z.object({}),

    exec: async nango => {
        const config: PaginationParams = {
            model: 'Item',
            additionalFilter: 'Active IN (true, false)'
        };

        // Fetch all items with pagination
        for await (const qItems of paginate<QuickBooksItem>(nango, config)) {
            // Filter and process active items
            const activeItems = qItems.filter((item) => item.Active);
            const mappedActiveItems = activeItems.map(toItem);
            await nango.batchSave(mappedActiveItems, 'Item');

            // Handle archived items only if it's an incremental refresh
            if (nango.lastSyncDate) {
                const archivedItems = qItems.filter((item) => !item.Active);
                const mappedArchivedItems = archivedItems.map(toItem);
                await nango.batchDelete(mappedArchivedItems, 'Item');
            }
        }
    }
});

export type NangoSyncLocal = Parameters<typeof sync["exec"]>[0];
export default sync;
