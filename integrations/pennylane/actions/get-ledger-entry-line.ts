import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('Ledger entry line ID. Example: 123456')
});

const ProviderLedgerAccountSchema = z.object({
    id: z.number(),
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
    ledger_account: ProviderLedgerAccountSchema,
    journal: ProviderJournalSchema,
    date: z.string(),
    ledger_entry: ProviderLedgerEntrySchema,
    lettered_ledger_entry_lines: ProviderLetteredLinesSchema.nullable().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const OutputSchema = z.object({
    id: z.number(),
    debit: z.string(),
    credit: z.string(),
    label: z.string(),
    ledger_account: ProviderLedgerAccountSchema,
    journal: ProviderJournalSchema,
    date: z.string(),
    ledger_entry: ProviderLedgerEntrySchema,
    lettered_ledger_entry_lines: ProviderLetteredLinesSchema.optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a ledger entry line.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ledger_entries:readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://pennylane.readme.io/reference/getledgerentryline
            endpoint: `/api/external/v2/ledger_entry_lines/${encodeURIComponent(String(input.id))}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Ledger entry line not found',
                id: input.id
            });
        }

        const providerLine = ProviderLedgerEntryLineSchema.parse(response.data);

        return {
            id: providerLine.id,
            debit: providerLine.debit,
            credit: providerLine.credit,
            label: providerLine.label,
            ledger_account: providerLine.ledger_account,
            journal: providerLine.journal,
            date: providerLine.date,
            ledger_entry: providerLine.ledger_entry,
            ...(providerLine.lettered_ledger_entry_lines != null && {
                lettered_ledger_entry_lines: providerLine.lettered_ledger_entry_lines
            }),
            ...(providerLine.created_at !== undefined && { created_at: providerLine.created_at }),
            ...(providerLine.updated_at !== undefined && { updated_at: providerLine.updated_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
