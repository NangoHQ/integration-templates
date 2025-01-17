import type { BillPayment } from '../../models';
import type { QuickBooksBillPayment } from '../types';

export function toBillPayment(billPayment: QuickBooksBillPayment): BillPayment {
    return {
        id: billPayment.Id,
        vendor_id: billPayment.VendorRef?.value,
        vendor_name: billPayment.VendorRef?.name,
        txn_date: new Date(billPayment.TxnDate).toISOString(),
        total_amount: billPayment.TotalAmt,
        currency: billPayment.CurrencyRef?.value,
        private_note: billPayment.PrivateNote,
        lines: billPayment.Line.map((line) => ({
            amount: line.Amount,
            linkedTxn: line.LinkedTxn.map((linkedTxn) => ({
                txn_id: linkedTxn.TxnId,
                txn_type: linkedTxn.TxnType
            }))
        }))
    };
}
