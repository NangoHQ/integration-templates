import { createSync } from "nango";
import type { QuickBooksInvoice } from '../types.js';
import { paginate } from '../helpers/paginate.js';
import { toInvoice } from '../mappers/to-invoice.js';
import type { PaginationParams } from '../helpers/paginate.js';

import { Invoice } from "../models.js";
import { z } from "zod";

/**
 * Fetches invoice data from QuickBooks API and saves it in batch.
 * Handles both active and voided invoices, saving or deleting them based on their status.
 * For detailed endpoint documentation, refer to:
 * https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/invoice#query-an-invoice
 *
 * @param nango The NangoSync instance used for making API calls and saving data.
 * @returns A promise that resolves when the data has been successfully fetched and saved.
 */
const sync = createSync({
    description: "Fetches all invoices in QuickBooks. Handles both active and voided invoices, saving or deleting them based on their status.",
    version: "1.0.0",
    frequency: "every hour",
    autoStart: true,
    syncType: "incremental",
    trackDeletes: false,

    endpoints: [{
        method: "GET",
        path: "/invoices",
        group: "Invoices"
    }],

    scopes: ["com.intuit.quickbooks.accounting"],

    models: {
        Invoice: Invoice
    },

    metadata: z.object({}),

    exec: async nango => {
        const config: PaginationParams = {
            model: 'Invoice'
        };

        let allPayments: QuickBooksInvoice[] = [];

        // Fetch all invoices with pagination
        for await (const invoices of paginate<QuickBooksInvoice>(nango, config)) {
            allPayments = [...allPayments, ...invoices];
        }

        // Filter and process invoices that are not voided (i.e., active invoices)
        const activeInvoices = allPayments.filter((invoice) => invoice.status !== 'Deleted' && !invoice.PrivateNote?.includes('Voided'));
        const mappedActiveInvoices = activeInvoices.map(toInvoice);
        await nango.batchSave(mappedActiveInvoices, 'Invoice');

        // Handle voided invoices only if it's an incremental refresh
        if (nango.lastSyncDate) {
            const voidedPayments = allPayments.filter((invoice) => invoice.status === 'Deleted' || invoice.PrivateNote?.includes('Voided'));
            const mappedVoidedPayments = voidedPayments.map(toInvoice);
            await nango.batchDelete(mappedVoidedPayments, 'Invoice');
        }
    }
});

export type NangoSyncLocal = Parameters<typeof sync["exec"]>[0];
export default sync;
