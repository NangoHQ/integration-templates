import type { QuickBooksJournalEntry, QuickBooksJournalLine } from '../types';
import type { JournalEntry, JournalEntryLine } from '../../models';

export function toJournalEntry(journalEntries: QuickBooksJournalEntry[]): JournalEntry[] {
    return journalEntries.map((entry): JournalEntry => {
        return {
            id: entry.Id,
            date: new Date(entry.TxnDate).toISOString(),
            created_at: new Date(entry.MetaData.CreateTime).toISOString(),
            updated_at: new Date(entry.MetaData.LastUpdatedTime).toISOString(),
            currency: entry.CurrencyRef?.value?.toLowerCase(),
            note: entry.PrivateNote,
            lines: entry.Line?.map(toJournalEntryLine)
        };
    });
}
// separate journal entry line to its own function
function toJournalEntryLine(line: QuickBooksJournalLine): JournalEntryLine {
    return {
        id: line.Id,
        type: line.DetailType,
        account_id: line.JournalEntryLineDetail.AccountRef.value,
        account_name: line.JournalEntryLineDetail.AccountRef.name || '',
        net_amount: line.Amount,
        posting_type: line.JournalEntryLineDetail.PostingType,
        description: line.Description || '',
        entity_type: line.JournalEntryLineDetail.Entity?.Type,
        entity_type_id: line.JournalEntryLineDetail.Entity?.EntityRef?.value,
        entity_type_name: line.JournalEntryLineDetail.Entity?.EntityRef?.name,
        department_id: line.JournalEntryLineDetail.DepartmentRef?.value,
        department_name: line.JournalEntryLineDetail.DepartmentRef?.name,
        class_id: line.JournalEntryLineDetail.ClassRef?.value,
        class_name: line.JournalEntryLineDetail.ClassRef?.name
    };
}
