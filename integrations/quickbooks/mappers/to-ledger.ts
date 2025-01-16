import type { QuickBooksJournalEntry } from '../types';
import type { JournalEntry, JournalEntryLine } from '../../models';

/**
 * Maps QuickBooks journal entries directly to unified general ledger format
 */
export function mapQuickBooksToUnified(journalEntries: QuickBooksJournalEntry[]): JournalEntry[] {
    return journalEntries.map(
        (entry): JournalEntry => ({
            id: entry.Id,
            date: new Date(entry.TxnDate).toISOString(),
            createdDate: new Date(entry.MetaData.CreateTime).toISOString(),
            updatedDate: new Date(entry.MetaData.LastUpdatedTime).toISOString(),
            currency: entry.CurrencyRef?.value?.toLowerCase(),
            note: entry.PrivateNote,
            lines: entry.Line.map(
                (line): JournalEntryLine => ({
                    journalLineId: line.Id,
                    type: line.DetailType,
                    accountId: line.JournalEntryLineDetail.AccountRef.value,
                    accountName: line.JournalEntryLineDetail.AccountRef.name || '',
                    netAmount: line.Amount,
                    postingType: line.JournalEntryLineDetail.PostingType,
                    description: line.Description,
                    entityType: line.JournalEntryLineDetail.Entity?.Type,
                    entityTypeId: line.JournalEntryLineDetail.Entity?.EntityRef?.value,
                    entityTypeName: line.JournalEntryLineDetail.Entity?.EntityRef?.name,
                    departmentId: line.JournalEntryLineDetail.DepartmentRef?.name,
                    departmentName: line.JournalEntryLineDetail.DepartmentRef?.value,
                    classId: line.JournalEntryLineDetail.ClassRef?.value,
                    className: line.JournalEntryLineDetail.ClassRef?.name
                })
            )
        })
    );
}
