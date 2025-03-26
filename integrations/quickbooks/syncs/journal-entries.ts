import type { DeleteResponse, JournalEntry, NangoSync } from '../../models';
import type { PaginationParams } from '../helpers/paginate';
import { paginate } from '../helpers/paginate.js';
import { toJournalEntry } from '../mappers/to-journal-entry.js';
import type { QuickBooksJournalEntry } from '../types';

/**
 * Fetches ledger data from QuickBooks API and saves it in batch using a unified general ledger format.
 * For detailed endpoint documentation, refer to:
 * https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/journalentry#query-a-journalentry
 *
 * @param nango The NangoSync instance used for making API calls and saving data.
 * @returns A promise that resolves when the data has been successfully fetched and saved.
 */
export default async function fetchData(nango: NangoSync): Promise<void> {
    const config: PaginationParams = {
        model: 'JournalEntry'
    };

    for await (const qJournalEntries of paginate<QuickBooksJournalEntry>(nango, config)) {
        const activeJournalEntries = qJournalEntries.filter((entry) => entry.status !== 'Deleted');
        const deletedJournalEntries = qJournalEntries.filter((entry) => entry.status === 'Deleted');

        // Process and save active journal entries
        if (activeJournalEntries.length > 0) {
            const mappedActiveJournalEntries = activeJournalEntries.map(toJournalEntry);
            await nango.batchSave<JournalEntry>(mappedActiveJournalEntries, 'JournalEntry');
        }

        // Process deletions if this is not the first sync
        if (nango.lastSyncDate && deletedJournalEntries.length > 0) {
            const mappedDeletedJournalEntries = deletedJournalEntries.map((entry) => ({
                id: entry.Id
            }));
            await nango.batchDelete<DeleteResponse>(mappedDeletedJournalEntries, 'JournalEntry');
        }
    }
}
