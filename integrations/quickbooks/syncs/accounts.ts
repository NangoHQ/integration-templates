import { createSync } from 'nango';
import type { QuickBooksAccount } from '../types.js';
import { paginate } from '../helpers/paginate.js';
import { toAccount } from '../mappers/to-account.js';
import type { PaginationParams } from '../helpers/paginate.js';

import { Account } from '../models.js';
import { z } from 'zod';

/**
 * Fetches account data from QuickBooks API and saves it in batch.
 * Handles both active and archived accounts, saving or deleting them based on their status.
 * For detailed endpoint documentation, refer to:
 * https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/account#query-an-account
 *
 * @param nango The NangoSync instance used for making API calls and saving data.
 * @returns A promise that resolves when the data has been successfully fetched and saved.
 */
const sync = createSync({
    description: 'Fetches all accounts in QuickBooks. Handles both active and archived accounts, saving or deleting them based on their status.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    syncType: 'incremental',
    trackDeletes: false,

    endpoints: [
        {
            method: 'GET',
            path: '/accounts',
            group: 'Accounts'
        }
    ],

    scopes: ['com.intuit.quickbooks.accounting'],

    models: {
        Account: Account
    },

    metadata: z.object({}),

    exec: async (nango) => {
        const config: PaginationParams = {
            model: 'Account',
            additionalFilter: 'Active IN (true, false)'
        };

        // Fetch all accounts with pagination
        for await (const qAccounts of paginate<QuickBooksAccount>(nango, config)) {
            // Filter and process active accounts
            const activeAccounts = qAccounts.filter((account) => account.Active);
            const mappedActiveAccounts = activeAccounts.map(toAccount);
            await nango.batchSave(mappedActiveAccounts, 'Account');

            // Handle archived accounts only if it's an incremental refresh
            if (nango.lastSyncDate) {
                const archivedAccounts = qAccounts.filter((account) => !account.Active);
                const mappedArchivedAccounts = archivedAccounts.map(toAccount);
                await nango.batchDelete(mappedArchivedAccounts, 'Account');
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
