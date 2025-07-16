import type { BankTransaction, BankTransactionLineItem, TrackingCategory } from ../models.js;
import type { XeroBankTransactionLineItem, XeroBankTransaction, XeroTrackingCategory } from '../types.js';

import { parseDate } from '../utils.js';

export function mapXeroBankTransaction(xeroBankTransaction: XeroBankTransaction): BankTransaction {
    return {
        id: xeroBankTransaction.BankTransactionID,
        type: xeroBankTransaction.Type,
        bank_account_id: xeroBankTransaction.BankAccount.AccountID,
        bank_account_code: xeroBankTransaction.BankAccount.Code,
        bank_account_name: xeroBankTransaction.BankAccount.Name,
        contact_id: xeroBankTransaction.Contact?.ContactID || '',
        contact_name: xeroBankTransaction.Contact?.Name || '',
        date: xeroBankTransaction.Date ? parseDate(xeroBankTransaction.Date).toISOString() : null,
        status: xeroBankTransaction.Status,
        reference: xeroBankTransaction.Reference || null,
        is_reconciled: xeroBankTransaction.IsReconciled,
        currency_code: xeroBankTransaction.CurrencyCode,
        currency_rate: xeroBankTransaction.CurrencyRate || null,
        total: xeroBankTransaction.Total,
        sub_total: xeroBankTransaction.SubTotal,
        total_tax: xeroBankTransaction.TotalTax,
        line_amount_types: xeroBankTransaction.LineAmountTypes,
        line_items: mapXeroBankTransactionLine(xeroBankTransaction.LineItems),
        updated_date: xeroBankTransaction.UpdatedDateUTC ? parseDate(xeroBankTransaction.UpdatedDateUTC).toISOString() : null,
        url: xeroBankTransaction.Url || null,
        has_attachments: xeroBankTransaction.HasAttachments
    };
}

function mapXeroBankTransactionLine(xeroBankTransactionLine: XeroBankTransactionLineItem[]): BankTransactionLineItem[] {
    return xeroBankTransactionLine.map((xeroBankTransactionLine) => {
        return {
            description: xeroBankTransactionLine.Description,
            quantity: xeroBankTransactionLine.Quantity,
            unit_amount: xeroBankTransactionLine.UnitAmount,
            account_code: xeroBankTransactionLine.AccountCode,
            item_code: xeroBankTransactionLine.ItemCode ?? null,
            line_item_id: xeroBankTransactionLine.LineItemID,
            tax_type: xeroBankTransactionLine.TaxType ?? null,
            tax_amount: xeroBankTransactionLine.TaxAmount,
            line_amount: xeroBankTransactionLine.LineAmount,
            tracking: mapXeroTrackingCategory(xeroBankTransactionLine.Tracking)
        };
    });
}

function mapXeroTrackingCategory(xeroTrackingCategory: XeroTrackingCategory[] | undefined): TrackingCategory[] | null {
    if (!xeroTrackingCategory) {
        return null;
    }
    return xeroTrackingCategory.map((xeroTrackingCategory) => {
        return {
            trackingCategoryId: xeroTrackingCategory.TrackingCategoryID ?? '',
            name: xeroTrackingCategory.Name ?? '',
            option: xeroTrackingCategory.Option ?? '',
            trackingOptionId: xeroTrackingCategory.TrackingOptionID ?? '',
            options: xeroTrackingCategory.Options ?? []
        };
    });
}
