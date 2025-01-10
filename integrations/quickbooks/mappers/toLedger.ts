import type { QuickBooksJournalEntry } from '../types';
import type { GeneralLedger, LedgerLine } from '../../models';

/**
 * Maps QuickBooks journal entries directly to unified general ledger format
 */
export function mapQuickBooksToUnified(journalEntries: QuickBooksJournalEntry[]): GeneralLedger[] {
    return journalEntries.map(
        (entry): GeneralLedger => ({
            id: entry.Id,
            date: new Date(entry.TxnDate).toISOString(),
            createdDate: new Date(entry.MetaData.CreateTime).toISOString(),
            updatedDate: new Date(entry.MetaData.LastUpdatedTime).toISOString(),
            currency: entry.CurrencyRef?.value?.toLowerCase(),
            note: entry.PrivateNote,
            lines: entry.Line.map(
                (line): LedgerLine => ({
                    journalLineId: line.Id,
                    type: line.DetailType,
                    accountId: line.JournalEntryLineDetail.AccountRef.value,
                    accountName: line.JournalEntryLineDetail.AccountRef.name,
                    netAmount: line.Amount,
                    postingType: line.JournalEntryLineDetail.PostingType,
                    description: line.Description
                })
            )
        })
    );
}
