import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderCategorySchema = z.object({
    id: z.number(),
    label: z.string(),
    weight: z.string(),
    category_group: z.object({
        id: z.number()
    }),
    analytical_code: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string()
});

const ProviderLedgerAccountSchema = z.object({
    id: z.number(),
    number: z.string(),
    url: z.string()
});

const ProviderJournalSchema = z.object({
    id: z.number(),
    url: z.string()
});

const ProviderLedgerEntrySchema = z.object({
    id: z.number()
});

const ProviderLetteredLinesSchema = z.object({
    ids: z.array(z.number()),
    url: z.string()
});

const ProviderLedgerEntryLineSchema = z.object({
    id: z.number(),
    debit: z.string(),
    credit: z.string(),
    label: z.string(),
    categories: z.array(ProviderCategorySchema),
    ledger_account: ProviderLedgerAccountSchema,
    journal: ProviderJournalSchema,
    date: z.string(),
    ledger_entry: ProviderLedgerEntrySchema,
    lettered_ledger_entry_lines: ProviderLetteredLinesSchema,
    created_at: z.string(),
    updated_at: z.string()
});

const LedgerEntryLineSchema = z.object({
    id: z.string(),
    debit: z.string().optional(),
    credit: z.string().optional(),
    label: z.string().optional(),
    date: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    ledger_account_id: z.string().optional(),
    ledger_account_number: z.string().optional(),
    journal_id: z.string().optional(),
    ledger_entry_id: z.string().optional(),
    lettered_line_ids: z.array(z.number()).optional(),
    categories: z.array(z.unknown()).optional()
});

const sync = createSync({
    description: 'Sync ledger entry lines',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        LedgerEntryLine: LedgerEntryLineSchema
    },

    exec: async (nango) => {
        // Full-refresh delete tracking requires starting from page 1 on every run.
        const proxyConfig: ProxyConfiguration = {
            // https://pennylane.readme.io/reference/getledgerentrylines
            endpoint: '/api/external/v2/ledger_entry_lines',
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'cursor',
                cursor_path_in_response: 'next_cursor',
                response_path: 'items',
                limit_name_in_request: 'limit',
                limit: 100
            },
            retries: 3
        };

        await nango.trackDeletesStart('LedgerEntryLine');

        for await (const page of nango.paginate(proxyConfig)) {
            const parsedPage = z.array(ProviderLedgerEntryLineSchema).safeParse(page);
            if (!parsedPage.success) {
                throw new Error(`Failed to parse ledger entry line page: ${parsedPage.error.message}`);
            }

            const lines = parsedPage.data.map((item) => {
                return {
                    id: String(item.id),
                    ...(item.debit != null && { debit: item.debit }),
                    ...(item.credit != null && { credit: item.credit }),
                    ...(item.label != null && { label: item.label }),
                    ...(item.date != null && { date: item.date }),
                    ...(item.created_at != null && { created_at: item.created_at }),
                    ...(item.updated_at != null && { updated_at: item.updated_at }),
                    ...(item.ledger_account != null && {
                        ledger_account_id: String(item.ledger_account.id),
                        ledger_account_number: item.ledger_account.number
                    }),
                    ...(item.journal != null && { journal_id: String(item.journal.id) }),
                    ...(item.ledger_entry != null && { ledger_entry_id: String(item.ledger_entry.id) }),
                    ...(item.lettered_ledger_entry_lines != null && {
                        lettered_line_ids: item.lettered_ledger_entry_lines.ids
                    }),
                    ...(item.categories != null && { categories: item.categories })
                };
            });

            if (lines.length > 0) {
                await nango.batchSave(lines, 'LedgerEntryLine');
            }
        }

        await nango.trackDeletesEnd('LedgerEntryLine');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
