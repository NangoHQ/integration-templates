import { createSync } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

const BankAccountSchema = z.object({
    id: z.string().describe('Stable string identifier of the bank account'),
    name: z.string().optional(),
    currency: z.string().optional(),
    balance: z.string().optional(),
    created_at: z.string().optional().describe('ISO 8601 timestamp'),
    updated_at: z.string().optional().describe('ISO 8601 timestamp'),
    bank_establishment_id: z.string().optional(),
    journal_id: z.string().optional(),
    ledger_account_id: z.string().optional()
});

const ProviderBankAccountSchema = z.object({
    id: z.number().describe('Example: 42'),
    name: z.string().describe('Example: Main account'),
    currency: z.string().describe('Example: EUR'),
    balance: z.string().describe('Example: 100.15'),
    created_at: z.string().describe('Example: 2023-08-30T10:08:08.146343Z'),
    updated_at: z.string().describe('Example: 2023-08-30T10:08:08.146343Z'),
    bank_establishment: z
        .object({
            id: z.number().describe('Example: 42')
        })
        .optional(),
    journal: z
        .object({
            id: z.number().describe('Example: 42'),
            url: z.string().describe('Example: https://app.pennylane.com/api/external/v2/journals/7')
        })
        .nullable()
        .optional(),
    ledger_account: z
        .object({
            id: z.number().describe('Example: 42'),
            url: z.string().describe('Example: https://app.pennylane.com/api/external/v2/ledger_accounts/8')
        })
        .optional()
});

const sync = createSync({
    description: 'Sync bank accounts.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        BankAccount: BankAccountSchema
    },
    scopes: ['bank_accounts:readonly'],

    exec: async (nango) => {
        // Blocker: the bank_accounts list endpoint does not expose a changed-since filter,
        // a deleted-record endpoint, or a resumable cursor across runs. We perform a full
        // crawl with cursor pagination and track deletions only after a complete successful run.
        await nango.trackDeletesStart('BankAccount');

        const proxyConfig: ProxyConfiguration = {
            // https://pennylane.readme.io/reference/getbankaccounts
            endpoint: '/api/external/v2/bank_accounts',
            params: {
                limit: 5
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'cursor',
                cursor_path_in_response: 'next_cursor',
                response_path: 'items',
                limit_name_in_request: 'limit',
                limit: 5
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            if (!Array.isArray(page)) {
                throw new Error('Expected page to be an array of bank accounts');
            }

            const bankAccounts = [];
            for (const item of page) {
                const record = ProviderBankAccountSchema.parse(item);

                bankAccounts.push({
                    id: String(record.id),
                    name: record.name,
                    ...(record.currency != null && { currency: record.currency }),
                    ...(record.balance != null && { balance: record.balance }),
                    ...(record.created_at != null && { created_at: record.created_at }),
                    ...(record.updated_at != null && { updated_at: record.updated_at }),
                    ...(record.bank_establishment != null && { bank_establishment_id: String(record.bank_establishment.id) }),
                    ...(record.journal != null && { journal_id: String(record.journal.id) }),
                    ...(record.ledger_account != null && { ledger_account_id: String(record.ledger_account.id) })
                });
            }

            if (bankAccounts.length > 0) {
                await nango.batchSave(bankAccounts, 'BankAccount');
            }
        }

        await nango.trackDeletesEnd('BankAccount');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
