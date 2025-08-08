import type { Transfer } from '../models.js';
import type { QuickBooksTransfer } from '../types.js';

export function toTransfer(transfer: QuickBooksTransfer): Transfer {
    if (!transfer.TxnDate || !transfer.MetaData?.CreateTime || !transfer.MetaData?.LastUpdatedTime) {
        throw new Error(`Missing required fields for transfer ${transfer.Id}`);
    }
    return {
        id: transfer.Id,
        from_account_id: transfer.FromAccountRef?.value,
        from_account_name: transfer.FromAccountRef?.name,
        to_account_id: transfer.ToAccountRef?.value,
        to_account_name: transfer.ToAccountRef?.name,
        amount: transfer.Amount,
        currency: transfer.CurrencyRef?.value,
        txn_date: new Date(transfer.TxnDate).toISOString(),
        private_note: transfer.PrivateNote,
        created_at: new Date(transfer.MetaData.CreateTime).toISOString(),
        updated_at: new Date(transfer.MetaData.LastUpdatedTime).toISOString()
    };
}
