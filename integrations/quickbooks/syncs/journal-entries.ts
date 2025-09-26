import { createSync } from 'nango';
import type { PaginationParams } from '../helpers/paginate.js';
import { paginate } from '../helpers/paginate.js';
import { toJournalEntry } from '../mappers/to-journal-entry.js';
import type { QuickBooksJournalEntry } from '../types.js';

import { JournalEntry } from '../models.js';
import { z } from 'zod';

/**
 * Fetches ledger data from QuickBooks API and saves it in batch using a unified general ledger format.
 * For detailed endpoint documentation, refer to:
 * https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/journalentry#query-a-journalentry
 *
 * @param nango The NangoSync instance used for making API calls and saving data.
 * @returns A promise that resolves when the data has been successfully fetched and saved.
 */
const sync = createSync({
    description: 'Fetch all journal entries in QuickBooks',
    version: '2.0.0',
    frequency: 'every hour',
    autoStart: true,
    syncType: 'incremental',

    endpoints: [
        {
            method: 'GET',
            path: '/journal-entries',
            group: 'Journal Entries'
        }
    ],

    scopes: ['com.intuit.quickbooks.accounting'],

    models: {
        JournalEntry: JournalEntry
    },

    metadata: z.object({}),

    exec: async (nango) => {
        const config: PaginationParams = {
            model: 'JournalEntry'
        };

        for await (const qJournalEntries of paginate<QuickBooksJournalEntry>(nango, config)) {
            const activeJournalEntries = qJournalEntries.filter((entry) => entry.status !== 'Deleted');
            const deletedJournalEntries = qJournalEntries.filter((entry) => entry.status === 'Deleted');

            // Process and save active journal entries
            if (activeJournalEntries.length > 0) {
                const mappedActiveJournalEntries = activeJournalEntries.map(toJournalEntry);
                await nango.batchSave(mappedActiveJournalEntries, 'JournalEntry');
            }

            // Process deletions if this is not the first sync
            if (nango.lastSyncDate && deletedJournalEntries.length > 0) {
                const mappedDeletedJournalEntries = deletedJournalEntries.map((entry) => ({
                    id: entry.Id
                }));
                await nango.batchDelete(mappedDeletedJournalEntries, 'JournalEntry');
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
