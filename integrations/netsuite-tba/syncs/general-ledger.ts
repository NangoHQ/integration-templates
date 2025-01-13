import type { NangoSync, GeneralLedger, ProxyConfiguration } from '../../models';
import type { NS_JournalEntry, NSAPI_GetResponse } from '../types';
import { paginate } from '../helpers/pagination.js';
import { mapNetSuiteToUnified } from '../mappers/to-general-ledger.js';

const retries = 3;

/**
 * Fetches data from NetSuite and processes journal entries.
 *
 * This function uses the NangoSync instance to fetch journal entries from NetSuite,
 * maps them to a unified format, and saves them in batches.
 *
 * @param {NangoSync} nango - The NangoSync instance used for fetching and logging data.
 * @returns {Promise<void>} A promise that resolves when the data fetching and processing is complete.
 *
 * @remarks
 * The function uses pagination to fetch journal entries in chunks. For each entry, it retrieves
 * detailed information, maps it to a unified format, and saves the mapped entries in batches.
 */

export default async function fetchData(nango: NangoSync): Promise<void> {
    const proxyConfig: ProxyConfiguration = {
        // https://system.netsuite.com/help/helpcenter/en_US/APIs/REST_API_Browser/record/v1/2022.1/index.html#tag-journalEntry
        endpoint: '/journalEntry',
        retries
    };
    for await (const entries of paginate<{ id: string }>({ nango, proxyConfig })) {
        await nango.log('Listed journalEntries', { total: entries.length });

        const mappedEntries: GeneralLedger[] = [];
        for (const entryLink of entries) {
            const nsJournalEntry: NSAPI_GetResponse<NS_JournalEntry> = await nango.get({
                endpoint: `/journalentry/${entryLink.id}`,
                params: {
                    expandSubResources: 'true'
                },
                retries
            });
            if (!nsJournalEntry.data) {
                await nango.log('Journal not found', { id: entryLink.id });
                continue;
            }
            const mappedEntry: GeneralLedger = mapNetSuiteToUnified(nsJournalEntry.data);
            mappedEntries.push(mappedEntry);
        }
        await nango.batchSave<GeneralLedger>(mappedEntries, 'GeneralLedger');
    }
}
