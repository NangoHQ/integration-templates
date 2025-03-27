import type { CreateJournalEntry, JournalEntry, NangoAction, ProxyConfiguration } from '../../models.js';
import { toJournalEntry, toQuickBooksJournalEntriesCreate } from '../mappers/to-journal-entry.js';
import { getCompany } from '../utils/get-company.js';

/**
 * This function handles the creation of a journal entry in QuickBooks via the Nango action.
 * It validates the input journal entry data, maps it to the appropriate QuickBooks journal entry structure,
 * and sends a request to create the journal entry in the QuickBooks API.
 * For detailed endpoint documentation, refer to:
 * https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/journalentry#create-a-journalentry
 *
 * @param {NangoAction} nango - The Nango action instance to handle API requests.
 * @param {CreateJournalEntry} input - The input data that will be sent to QuickBooks.
 * @throws {nango.ActionError} - Throws an error if the input is missing or lacks required fields.
 * @returns {Promise<JournalEntry>} - Returns the created journal entry object from QuickBooks.
 */
export default async function runAction(nango: NangoAction, input: CreateJournalEntry): Promise<JournalEntry> {
    // Validate that we have both credit and debit entries
    const hasCredit = input.line_items.some((line) => line.journal_entry_line_detail.posting_type === 'Credit');
    const hasDebit = input.line_items.some((line) => line.journal_entry_line_detail.posting_type === 'Debit');

    if (!hasCredit || !hasDebit) {
        throw new nango.ActionError({
            message: 'Journal entry must have at least one Credit and one Debit line',
            details: {
                lines_received: input.line_items.map((line) => ({
                    posting_type: line.journal_entry_line_detail.posting_type,
                    amount: line.amount
                }))
            }
        });
    }

    const companyId = await getCompany(nango);

    const quickBooksJournalEntry = toQuickBooksJournalEntriesCreate(input);

    const config: ProxyConfiguration = {
        // https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/journalentry#create-a-journalentry
        endpoint: `/v3/company/${companyId}/journalentry`,
        data: quickBooksJournalEntry,
        retries: 3
    };

    const response = await nango.post(config);

    return toJournalEntry(response.data['JournalEntry']);
}
