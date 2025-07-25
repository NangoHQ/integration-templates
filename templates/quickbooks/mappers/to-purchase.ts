import type { Purchase } from '../models.js';
import type { QuickBooksPurchase } from '../types.js';

export function toPurchase(purchase: QuickBooksPurchase): Purchase {
    if (!purchase.TxnDate || !purchase.MetaData?.CreateTime || !purchase.MetaData?.LastUpdatedTime) {
        throw new Error(`Missing required Date fields for transfer ${purchase.Id}`);
    }
    return {
        id: purchase.Id,
        account_id: purchase.AccountRef.value,
        account_name: purchase.AccountRef.name,
        payment_type: purchase.PaymentType,
        entity_type: purchase.EntityRef?.type,
        entity_id: purchase.EntityRef?.value,
        entity_name: purchase.EntityRef?.name,
        total_amount: purchase.TotalAmt,
        print_status: purchase.PrintStatus,
        created_at: new Date(purchase.MetaData.CreateTime).toISOString(),
        updated_at: new Date(purchase.MetaData.LastUpdatedTime).toISOString(),
        doc_number: purchase.DocNumber,
        txn_date: new Date(purchase.TxnDate).toISOString(),
        currency: purchase.CurrencyRef?.value,
        lines: purchase.Line.map((line) => ({
            id: line.Id,
            description: line.Description,
            detail_type: line.DetailType,
            amount: line.Amount,
            account_name: line.AccountBasedExpenseLineDetail?.AccountRef?.name,
            account_id: line.AccountBasedExpenseLineDetail?.AccountRef?.value,
            billable_status: line.AccountBasedExpenseLineDetail?.BillableStatus,
            tax_code: line.AccountBasedExpenseLineDetail?.TaxCodeRef?.value
        }))
    };
}
