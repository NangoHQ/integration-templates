import type {
    CustomField,
    ItemBasedExpenseLine,
    LinkedTxn,
    MarkupInfo,
    PhysicalAddress,
    PurchaseOrder,
    PurchaseOrderLine,
    Reference,
    TxnTaxDetail
} from '../../models';
import type {
    QuickBooksPurchaseOrder,
    QuickBooksPurchaseOrderLine,
    PhysicalAddress as QBPhysicalAddress,
    QuickBooksItemBasedExpenseLineDetail,
    QuickBooksMarkupInfo,
    QuickBooksCustomField,
    ReferenceType,
    TxnTaxDetail as QuickBooksTxnTaxDetail
} from '../types';
import { mapReference } from '../utils/map-reference.js';

/**
 * Converts a QuickBooksPurchaseOrder object to internal PurchaseOrder format.
 * Only includes fields that have values, avoiding undefined assignments.
 *
 * @param purchaseOrder The QuickBooksPurchaseOrder object to convert
 * @returns PurchaseOrder object representing internal purchase order information
 */
export function toPurchaseOrder(purchaseOrder: QuickBooksPurchaseOrder): PurchaseOrder {
    // Fields that must always be present
    const baseOrder: PurchaseOrder = {
        id: purchaseOrder.Id || '',
        created_at: new Date(purchaseOrder.MetaData?.CreateTime || '').toISOString(),
        updated_at: new Date(purchaseOrder.MetaData?.LastUpdatedTime || purchaseOrder.MetaData?.CreateTime || '').toISOString(),
        ap_account_ref: mapReferenceFromQB(purchaseOrder.APAccountRef) || { value: '', name: '' },
        vendor_ref: mapReferenceFromQB(purchaseOrder.VendorRef) || { value: '', name: '' },
        line: mapQBPurchaseOrderLines(purchaseOrder.Line),
        total_amt_cents: (purchaseOrder.TotalAmt || 0) * 100
    };

    // Optional fields - only include if they have values
    const optionalFields: Partial<PurchaseOrder> = {};

    if (purchaseOrder.SyncToken) optionalFields.sync_token = purchaseOrder.SyncToken;

    const currencyRef = mapReferenceFromQB(purchaseOrder.CurrencyRef);
    if (currencyRef) optionalFields.currency_ref = currencyRef;

    if (purchaseOrder.GlobalTaxCalculation) optionalFields.global_tax_calculation = purchaseOrder.GlobalTaxCalculation;
    if (purchaseOrder.TxnDate) optionalFields.txn_date = purchaseOrder.TxnDate;

    const customFields = mapCustomFields(purchaseOrder.CustomField);
    if (customFields) optionalFields.custom_field = customFields;

    if (purchaseOrder.POEmail?.Address) optionalFields.po_email = purchaseOrder.POEmail.Address;

    const classRef = mapReferenceFromQB(purchaseOrder.ClassRef);
    if (classRef) optionalFields.class_ref = classRef;

    const salesTermRef = mapReferenceFromQB(purchaseOrder.SalesTermRef);
    if (salesTermRef) optionalFields.sales_term_ref = salesTermRef;

    const linkedTxn = mapQBLinkedTransactions(purchaseOrder.LinkedTxn);
    if (linkedTxn) optionalFields.linked_txn = linkedTxn;
    const txnTaxDetail = mapTxnTaxDetail(purchaseOrder.TxnTaxDetail);
    if (txnTaxDetail) optionalFields.txn_tax_detail = txnTaxDetail;

    if (purchaseOrder.Memo) optionalFields.memo = purchaseOrder.Memo;
    if (purchaseOrder.POStatus) optionalFields.po_status = purchaseOrder.POStatus;
    if (purchaseOrder.TransactionLocationType) optionalFields.transaction_location_type = purchaseOrder.TransactionLocationType;
    if (purchaseOrder.DueDate?.date) optionalFields.due_date = purchaseOrder.DueDate.date;
    if (purchaseOrder.DocNumber) optionalFields.doc_number = purchaseOrder.DocNumber;
    if (purchaseOrder.PrivateNote) optionalFields.private_note = purchaseOrder.PrivateNote;

    const shipMethodRef = mapReferenceFromQB(purchaseOrder.ShipMethodRef);
    if (shipMethodRef) optionalFields.ship_method_ref = shipMethodRef;

    const shipTo = mapReferenceFromQB(purchaseOrder.ShipTo);
    if (shipTo) optionalFields.ship_to = shipTo;

    if (purchaseOrder.ExchangeRate) optionalFields.exchange_rate = purchaseOrder.ExchangeRate;

    const shipAddr = mapPhysicalAddress(purchaseOrder.ShipAddr);
    if (shipAddr) optionalFields.ship_addr = shipAddr;

    const vendorAddr = mapPhysicalAddress(purchaseOrder.VendorAddr);
    if (vendorAddr) optionalFields.vendor_addr = vendorAddr;

    if (purchaseOrder.EmailStatus) optionalFields.email_status = purchaseOrder.EmailStatus;

    const recurDataRef = mapReferenceFromQB(purchaseOrder.RecurDataRef);
    if (recurDataRef) optionalFields.recur_data_ref = recurDataRef;

    return {
        ...baseOrder,
        ...optionalFields
    };
}

/**
 * Maps the purchase order data from the input format to the QuickBooks purchase order structure.
 *
 * @param {CreatePurchaseOrder} purchaseOrder - The purchase order data input object that needs to be mapped.
 * @returns {CreateQuickBooksPurchaseOrder} - The mapped QuickBooks purchase order object.
 */
export function toQuickBooksPurchaseOrder(purchaseOrder: Partial<PurchaseOrder>): Partial<QuickBooksPurchaseOrder> {
    const quickBooksPurchaseOrder: Partial<QuickBooksPurchaseOrder> = {
        // Required fields
        APAccountRef: mapReference(purchaseOrder.ap_account_ref) || { value: '', name: '' },
        VendorRef: mapReference(purchaseOrder.vendor_ref) || { value: '', name: '' },
        Line: Array.isArray(purchaseOrder.line) ? mapPurchaseOrderLines(purchaseOrder.line) : []
    };

    const currRef = mapReference(purchaseOrder.currency_ref);
    if (currRef) {
        quickBooksPurchaseOrder.CurrencyRef = currRef;
    }

    return quickBooksPurchaseOrder;
}

/**
 * Maps a QuickBooks reference type to internal reference format
 */
function mapReferenceFromQB(ref: ReferenceType | undefined): Reference | undefined {
    if (!ref?.value) return undefined;
    return {
        value: ref.value,
        ...(ref.name && { name: ref.name })
    };
}

/**
 * Maps QuickBooks transaction tax detail to internal format
 */
function mapTxnTaxDetail(detail: QuickBooksTxnTaxDetail | undefined): TxnTaxDetail | undefined {
    if (!detail) return undefined;

    return {
        txn_tax_code_ref: mapReferenceFromQB(detail.TxnTaxCodeRef) || { value: '', name: '' },
        total_tax_cents: (detail.TotalTax || 0) * 100
    };
}

/**
 * Maps QuickBooks custom fields to internal format
 */
function mapCustomFields(fields: QuickBooksCustomField[] | undefined): CustomField[] | undefined {
    if (!fields?.length) return undefined;

    return fields.map((field) => ({
        definition_id: field.DefinitionId,
        ...(field.Name && { name: field.Name }),
        ...(field.Type && { type: field.Type }),
        ...(field.StringValue && { string_value: field.StringValue })
    }));
}

/**
 * Maps QuickBooks linked transactions to internal format
 */
function mapQBLinkedTransactions(txns: any[] | undefined): LinkedTxn[] | undefined {
    if (!txns?.length) return undefined;

    return txns.map((txn) => ({
        txn_id: txn.TxnId,
        txn_type: txn.TxnType,
        ...(txn.TxnLineId && { txn_line_id: txn.TxnLineId })
    }));
}

/**
 * Maps QuickBooks markup info to internal format
 */
function mapMarkupInfo(markupInfo: QuickBooksMarkupInfo | undefined): MarkupInfo | undefined {
    if (!markupInfo) return undefined;

    const mappedInfo: Partial<MarkupInfo> = {};

    if (markupInfo.PriceLevelRef) {
        const ref = mapReferenceFromQB(markupInfo.PriceLevelRef);
        if (ref) mappedInfo.price_level_ref = ref;
    }

    if (markupInfo.Percent !== undefined) {
        mappedInfo.percent = markupInfo.Percent;
    }

    if (markupInfo.MarkUpIncomeAccountRef) {
        const ref = mapReferenceFromQB(markupInfo.MarkUpIncomeAccountRef);
        if (ref) mappedInfo.mark_up_income_account_ref = ref;
    }

    return Object.keys(mappedInfo).length ? mappedInfo : undefined;
}

/**
 * Maps QuickBooks item based expense line detail to internal format
 */
function mapQBItemBasedExpenseLineDetail(detail: QuickBooksItemBasedExpenseLineDetail | undefined): ItemBasedExpenseLine | undefined {
    if (!detail) return undefined;

    const mappedDetail: Partial<ItemBasedExpenseLine> = {};

    if (detail.ItemRef) {
        const ref = mapReferenceFromQB(detail.ItemRef);
        if (ref) mappedDetail.item_ref = ref;
    }

    if (detail.PriceLevelRef) {
        const ref = mapReferenceFromQB(detail.PriceLevelRef);
        if (ref) mappedDetail.price_level_ref = ref;
    }

    if (detail.Qty !== undefined) {
        mappedDetail.qty = detail.Qty;
    }

    if (detail.UnitPrice !== undefined) {
        mappedDetail.unit_price_cents = detail.UnitPrice * 100;
    }

    if (detail.TaxInclusiveAmt !== undefined) {
        mappedDetail.tax_inclusive_amt = detail.TaxInclusiveAmt;
    }

    if (detail.CustomerRef) {
        const ref = mapReferenceFromQB(detail.CustomerRef);
        if (ref) mappedDetail.customer_ref = ref;
    }

    if (detail.ClassRef) {
        const ref = mapReferenceFromQB(detail.ClassRef);
        if (ref) mappedDetail.class_ref = ref;
    }

    if (detail.TaxCodeRef) {
        const ref = mapReferenceFromQB(detail.TaxCodeRef);
        if (ref) mappedDetail.tax_code_ref = ref;
    }

    const markupInfo = mapMarkupInfo(detail.MarkupInfo);
    if (markupInfo) {
        mappedDetail.markup_info = markupInfo;
    }

    if (detail.BillableStatus) {
        mappedDetail.billable_status = detail.BillableStatus;
    }

    return Object.keys(mappedDetail).length ? mappedDetail : undefined;
}

/**
 * Maps a physical address from QuickBooks format
 */
function mapPhysicalAddress(addr: QBPhysicalAddress | undefined): PhysicalAddress | undefined {
    if (!addr) return undefined;

    const mappedAddr: PhysicalAddress = {
        id: addr.Id ?? ''
    };

    if (addr.Line1) mappedAddr.line1 = addr.Line1;
    if (addr.Line2) mappedAddr.line2 = addr.Line2;
    if (addr.Line3) mappedAddr.line3 = addr.Line3;
    if (addr.Line4) mappedAddr.line4 = addr.Line4;
    if (addr.Line5) mappedAddr.line5 = addr.Line5;
    if (addr.City) mappedAddr.city = addr.City;
    if (addr.SubDivisionCode) mappedAddr.sub_division_code = addr.SubDivisionCode;
    if (addr.PostalCode) mappedAddr.postal_code = addr.PostalCode;
    if (addr.Country) mappedAddr.country = addr.Country;
    if (addr.CountrySubDivisionCode) mappedAddr.country_sub_division_code = addr.CountrySubDivisionCode;
    if (addr.Lat) mappedAddr.lat = addr.Lat;
    if (addr.Long) mappedAddr.long = addr.Long;

    return Object.keys(mappedAddr).length > 1 ? mappedAddr : undefined;
}

/**
 * Maps QuickBooks purchase order lines to internal format
 */
function mapQBPurchaseOrderLines(lines: QuickBooksPurchaseOrderLine[] | undefined): PurchaseOrderLine[] {
    if (!lines?.length) return [];

    return lines.map((line) => {
        const mappedLine: PurchaseOrderLine = {
            amount_cents: (line.Amount || 0) * 100,
            detail_type: line.DetailType
        };
        if (line.ProjectRef) mappedLine.project_ref = mapReferenceFromQB(line.ProjectRef) || { value: '' };
        if (line.Id) mappedLine.id = line.Id;
        if (line.Description) mappedLine.description = line.Description;
        if (line.LineNum !== undefined) mappedLine.line_num = line.LineNum;

        const linkedTxn = mapQBLinkedTransactions(line.LinkedTxn);
        if (linkedTxn) mappedLine.linked_txn = linkedTxn;

        const itemDetail = mapQBItemBasedExpenseLineDetail(line.ItemBasedExpenseLineDetail);
        if (itemDetail) mappedLine.item_based_expense_line_detail = itemDetail;

        return mappedLine;
    });
}

/**
 * Maps an array of purchase order lines to QuickBooks format
 *
 * @param lines Array of purchase order lines to map
 * @returns Array of QuickBooks purchase order lines
 */
function mapPurchaseOrderLines(lines: PurchaseOrderLine[]): QuickBooksPurchaseOrderLine[] {
    return lines.map((line) => {
        // const projectRef = mapReference(line.project_ref); : api error if mapped
        return {
            Amount: line.amount_cents / 100,
            DetailType: line.detail_type,
            // ...(projectRef && { ProjectRef: projectRef }),
            ItemBasedExpenseLineDetail: line.item_based_expense_line_detail ? mapItemBasedExpenseLineDetail(line.item_based_expense_line_detail) : {},
            ...(line.description && { Description: line.description }),
            ...(line.line_num && { LineNum: line.line_num }),
            ...(line.linked_txn && { LinkedTxn: mapLinkedTransactions(line.linked_txn) })
        };
    });
}

/**
 * Maps the item-based expense line detail to QuickBooks format
 *
 * @param detail The expense line detail to map
 * @returns Mapped QuickBooks item-based expense line detail
 */
function mapItemBasedExpenseLineDetail(detail: ItemBasedExpenseLine): QuickBooksItemBasedExpenseLineDetail {
    const mappedDetail: QuickBooksItemBasedExpenseLineDetail = {};

    const itemRef = mapReference(detail.item_ref);
    if (itemRef) {
        mappedDetail.ItemRef = itemRef;
    }

    const priceLevelRef = mapReference(detail.price_level_ref);
    if (priceLevelRef) {
        mappedDetail.PriceLevelRef = priceLevelRef;
    }

    if (detail.qty !== undefined) {
        mappedDetail.Qty = detail.qty;
    }

    if (detail.unit_price_cents !== undefined) {
        mappedDetail.UnitPrice = detail.unit_price_cents / 100;
    }

    if (detail.tax_inclusive_amt !== undefined) {
        mappedDetail.TaxInclusiveAmt = detail.tax_inclusive_amt;
    }

    const customerRef = mapReference(detail.customer_ref);
    if (customerRef) {
        mappedDetail.CustomerRef = customerRef;
    }

    const classRef = mapReference(detail.class_ref);
    if (classRef) {
        mappedDetail.ClassRef = classRef;
    }

    const taxCodeRef = mapReference(detail.tax_code_ref);
    if (taxCodeRef) {
        mappedDetail.TaxCodeRef = taxCodeRef;
    }

    if (detail.markup_info) {
        mappedDetail.MarkupInfo = {
            ...(detail.markup_info.price_level_ref &&
                (() => {
                    const priceRef = mapReference(detail.markup_info.price_level_ref);
                    if (priceRef) {
                        return { PriceLevelRef: priceRef };
                    }
                    return {};
                })()),
            ...(detail.markup_info.percent !== undefined && {
                Percent: detail.markup_info.percent
            }),
            ...(detail.markup_info.mark_up_income_account_ref &&
                (() => {
                    const markUpRef = mapReference(detail.markup_info.mark_up_income_account_ref);
                    if (markUpRef) {
                        return { MarkUpIncomeAccountRef: markUpRef };
                    }
                    return {};
                })())
        };
    }
    if (detail.billable_status) {
        mappedDetail.BillableStatus = detail.billable_status;
    }

    return mappedDetail;
}

/**
 * Maps linked transactions to QuickBooks format
 *
 * @param transactions Array of linked transactions to map
 * @returns Mapped QuickBooks linked transactions
 */
function mapLinkedTransactions(transactions: LinkedTxn[]) {
    return transactions.map((txn) => ({
        TxnId: txn.txn_id,
        TxnType: txn.txn_type,
        ...(txn.txn_line_id && { TxnLineId: txn.txn_line_id })
    }));
}
