import type { Deposit } from '../models.js';
import type { QuickBooksDeposit } from '../types.js';

export function toDeposit(deposit: QuickBooksDeposit): Deposit {
    return {
        id: deposit.Id,
        account_id: deposit.DepositToAccountRef?.value,
        account_name: deposit.DepositToAccountRef?.name,
        txn_date: new Date(deposit.TxnDate).toISOString(),
        total_amount: deposit.TotalAmt,
        currency: deposit.CurrencyRef?.value,
        private_note: deposit.PrivateNote,
        created_at: new Date(deposit.MetaData.CreateTime).toISOString(),
        updated_at: new Date(deposit.MetaData.LastUpdatedTime).toISOString(),
        lines: deposit.Line.map((line) => ({
            id: line.Id,
            amount: line.Amount,
            detail_type: line.DetailType,
            deposit_account_id: line.DepositLineDetail?.AccountRef?.value,
            deposit_account_name: line.DepositLineDetail?.AccountRef?.name
        }))
    };
}
