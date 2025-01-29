import type { Bill } from '../../models';
import type { QuickBooksBill } from '../types';

export function toBill(bill: QuickBooksBill): Bill {
    return {
        id: bill.Id,
        sales_term_id: bill.SalesTermRef?.value,
        due_date: new Date(bill.DueDate).toISOString(),
        balance: bill.Balance,
        created_at: new Date(bill.MetaData.CreateTime).toISOString(),
        updated_at: new Date(bill.MetaData.LastUpdatedTime).toISOString(),
        txn_date: new Date(bill.TxnDate).toISOString(),
        currency: bill.CurrencyRef?.value,
        vendor_id: bill.VendorRef.value,
        vendor_name: bill.VendorRef.name,
        ap_account_id: bill.APAccountRef?.value,
        ap_account_name: bill.APAccountRef?.name,
        total_amount: bill.TotalAmt,
        lines: bill.Line.map((line) => ({
            id: line.Id,
            detail_type: line.DetailType,
            amount: line.Amount,
            account_id: line.AccountBasedExpenseLineDetail?.AccountRef?.value,
            account_name: line.AccountBasedExpenseLineDetail?.AccountRef?.name
        }))
    };
}
