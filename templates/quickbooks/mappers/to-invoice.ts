import type { Invoice, CreateInvoice, UpdateInvoice, Line } from ../models.js;
import type { QuickBooksInvoice, LineInvoice, CreateLineInvoice } from '../types.js';
import { toDate } from '../utils/to-date.js';
import { mapReference } from '../utils/map-reference.js';

/**
 * Converts a QuickBooksInvoice object to an Invoice object.
 * Only includes essential properties mapped from QuickBooksInvoice.
 * @param invoice The QuickBooksInvoice object to convert.
 * @returns Invoice object representing QuickBooks invoice information.
 */
export function toInvoice(invoice: QuickBooksInvoice): Invoice {
    return {
        created_at: invoice.MetaData?.CreateTime ? new Date(invoice.MetaData.CreateTime).toISOString() : '',
        updated_at: new Date(invoice.MetaData.LastUpdatedTime).toISOString(),
        id: invoice.Id,
        txn_date: invoice.TxnDate,
        due_date: invoice.DueDate,
        balance_cents: invoice.Balance * 100,
        total_amt_cents: invoice.TotalAmt * 100,
        deposit_cents: (invoice.Deposit || 0) * 100,
        bill_address: invoice.BillAddr
            ? {
                  city: invoice.BillAddr.City ?? null,
                  line1: invoice.BillAddr.Line1 ?? null,
                  postal_code: invoice.BillAddr.PostalCode ?? null,
                  country: invoice.BillAddr.Country ?? null,
                  id: invoice.BillAddr.Id
              }
            : null,
        items: (invoice.Line || [])
            .filter((line: LineInvoice) => line.DetailType === 'SalesItemLineDetail')
            .map((line: LineInvoice) => ({
                id: line.Id,
                description: line.Description ?? null,
                qty: line.SalesItemLineDetail?.Qty ?? 0,
                unit_price_cents: (line.SalesItemLineDetail?.UnitPrice || 0) * 100,
                amount_cents: line.Amount * 100
            }))
    };
}

/**
 * Maps the invoice data from the input format to the QuickBooks invoice structure.
 * This function checks for the presence of various fields in the invoice object and maps them
 * to the corresponding fields expected by QuickBooks.
 *
 * @param {CreateInvoice} invoice - The invoice data input object that needs to be mapped.
 * @returns {QuickBooksInvoice} - The mapped QuickBooks invoice object.
 */
export function toQuickBooksInvoice(invoice: CreateInvoice | UpdateInvoice): Partial<Omit<QuickBooksInvoice, 'Line'> & { Line: CreateLineInvoice[] }> {
    const quickBooksInvoice: Partial<Omit<QuickBooksInvoice, 'Line'> & { Line: CreateLineInvoice[] }> = {};

    // Handle update scenarios if applicable
    if ('id' in invoice && 'sync_token' in invoice) {
        const updateInvoice: UpdateInvoice = invoice;
        quickBooksInvoice.Id = updateInvoice.id;
        quickBooksInvoice.SyncToken = updateInvoice.sync_token;
        quickBooksInvoice.sparse = true;
    }

    const customerRef = mapReference(invoice.customer_ref);
    if (customerRef) {
        quickBooksInvoice.CustomerRef = customerRef;
    }

    if (invoice.due_date) {
        quickBooksInvoice.DueDate = toDate(invoice.due_date);
    }

    if (invoice.line) {
        quickBooksInvoice.Line = invoice.line.map((line: Line) => {
            const qbLine: CreateLineInvoice = {
                DetailType: line.detail_type,
                Amount: line.amount_cents / 100
            };

            if (line.sales_item_line_detail) {
                qbLine.SalesItemLineDetail = {
                    ItemRef: {
                        value: line.sales_item_line_detail.item_ref.value,
                        name: line.sales_item_line_detail.item_ref.name ?? ''
                    }
                };

                if (line.quantity) {
                    qbLine.SalesItemLineDetail.Qty = line.quantity;
                }

                if (line.unit_price_cents) {
                    qbLine.SalesItemLineDetail.UnitPrice = line.unit_price_cents / 100;
                }

                if (line.discount_rate) {
                    qbLine.SalesItemLineDetail.DiscountRate = line.discount_rate;
                }
            }

            if (line.description) {
                qbLine.Description = line.description;
            }

            return qbLine;
        });
    }

    const currencyRef = mapReference(invoice.currency_ref);
    if (currencyRef) {
        quickBooksInvoice.CurrencyRef = currencyRef;
    }

    const projectRef = mapReference(invoice.project_ref);
    if (projectRef) {
        quickBooksInvoice.ProjectRef = projectRef;
    }

    return quickBooksInvoice;
}
