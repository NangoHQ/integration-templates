import { createSync } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

const BankAccountSchema = z
    .object({
        id: z.string().describe('Unique identifier of the linked bank account.'),
        account_name: z.string().describe('Display name of the linked bank account.'),
        account_number_last_four: z.string().describe('Last four digits of the linked bank account number.'),
        account_subtype: z.string().describe('Bank account subtype reported by the linked institution.'),
        connection_provider: z
            .enum(['finicity', 'manual', 'plaid', 'ramp_brokerage', 'ramp_wallet', 'teller'])
            .describe('Provider through which the bank account was linked (finicity, manual, plaid, ramp_brokerage, ramp_wallet, or teller).'),
        financial_institution_name: z.string().nullable().describe('Name of the associated financial institution, or null when it is not available.'),
        has_ach_details: z.boolean().describe('Whether Ramp holds ACH routing and account numbers for the account.')
    })
    .describe('An externally-linked bank account used as a Bill Pay funding source or vendor payment destination.');

const CheckpointSchema = z.object({
    start: z.string().describe('Ramp pagination cursor extracted from `page.next`, or an empty string when no full refresh is in progress.')
});

const sync = createSync({
    description: 'Sync externally-linked bank accounts used as Bill Pay funding sources and vendor payment destinations.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    scopes: ['bank_accounts:read'],
    checkpoint: CheckpointSchema,
    models: {
        BankAccount: BankAccountSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let start = typeof checkpoint?.['start'] === 'string' && checkpoint['start'] !== '' ? checkpoint['start'] : undefined;

        // Ramp exposes only cursor pagination here, not a changed-since filter. Keep this as a
        // full refresh, but persist the page cursor so an interrupted scan can resume.
        await nango.trackDeletesStart('BankAccount');

        const proxyConfig: ProxyConfiguration = {
            // https://docs.ramp.com/developer-api/v1/api/bank-accounts
            endpoint: '/developer/v1/bank-accounts',
            params: {
                ...(start !== undefined ? { start } : {})
            },
            paginate: {
                type: 'link',
                link_path_in_response_body: 'page.next',
                response_path: 'data',
                limit_name_in_request: 'page_size',
                limit: 100,
                on_page: async ({ nextPageParam }) => {
                    start =
                        typeof nextPageParam === 'string' ? (new URL(nextPageParam, 'https://ramp.invalid').searchParams.get('start') ?? undefined) : undefined;
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate<unknown>(proxyConfig)) {
            const accounts = page.map((account) => BankAccountSchema.parse(account));

            await nango.batchSave(accounts, 'BankAccount');

            if (start !== undefined) {
                await nango.saveCheckpoint({ start });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('BankAccount');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
