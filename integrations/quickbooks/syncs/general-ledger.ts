import type { QuickBooksJournalEntry } from '../types';
import type { NangoSync } from '../../models';
import { paginate } from '../helpers/paginate.js';
import type { PaginationParams } from '../helpers/paginate';
import { mapQuickBooksToUnified } from '../mappers/to-ledger.js';

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
    for await (const journalEntries of paginate<QuickBooksJournalEntry>(nango, config)) {
        const unifiedLedgers = mapQuickBooksToUnified(journalEntries);
        await nango.batchSave(unifiedLedgers, 'GeneralLedger');
        await nango.log(`Successfully saved ${journalEntries.length} entries`);
    }
}
