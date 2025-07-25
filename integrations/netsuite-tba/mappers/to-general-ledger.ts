import type { NS_JournalEntry } from '../types.js';
import type { GeneralLedger, LedgerLine } from '../../models.js';

/**
 * Maps a NetSuite journal entry to a unified journal entry format.
 *
 * @param entry - The NetSuite journal entry to be mapped.
 * @returns The mapped unified journal entry.
 */
export function mapNetSuiteToUnified(entry: NS_JournalEntry): GeneralLedger {
    return {
        id: entry.id,
        date: new Date(entry.tranDate).toISOString(),
        transactionId: entry.tranId ?? '',
        void: entry.void,
        approved: entry.approved,
        currency: entry.currency?.refName ?? '',
        createdDate: new Date(entry.createdDate).toISOString(),
        updatedDate: new Date(entry.lastModifiedDate).toISOString(),
        isReversal: entry.isReversal,
        subsidiary: {
            id: entry.subsidiary?.id ?? '',
            name: entry.subsidiary?.refName ?? ''
        },
        lines: entry.line.items.map(
            (line): LedgerLine => ({
                journalLineId: line.line.toString(),
                accountId: line.account?.id ?? '',
                accountName: line.account?.refName ?? '',
                cleared: line.cleared,
                credit: line.credit ?? 0,
                debit: line.debit ?? 0,
                description: line.memo ?? ''
            })
        )
    };
}
