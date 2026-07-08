import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().int().describe('Ledger entry ID. Example: 42')
});

const ProviderJournalSchema = z.object({
    id: z.number().int(),
    url: z.string()
});

const ProviderCategoryGroupSchema = z.object({
    id: z.number().int()
});

const ProviderCategorySchema = z.object({
    id: z.number().int(),
    label: z.string(),
    weight: z.string(),
    category_group: ProviderCategoryGroupSchema,
    analytical_code: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string()
});

const ProviderAttachmentSchema = z.object({
    filename: z.string(),
    url: z.string()
});

const ProviderLedgerAccountSchema = z.object({
    id: z.number().int(),
    number: z.string(),
    url: z.string()
});

const ProviderLedgerEntryLineSchema = z.object({
    id: z.number().int(),
    debit: z.string(),
    credit: z.string(),
    ledger_account: ProviderLedgerAccountSchema,
    label: z.string()
});

const ProviderLedgerEntrySchema = z.object({
    id: z.number().int(),
    label: z.string(),
    piece_number: z.string().nullable(),
    date: z.string(),
    due_date: z.string().nullable(),
    invoice_number: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string(),
    journal: ProviderJournalSchema,
    status: z.string().nullable(),
    categories: z.array(ProviderCategorySchema),
    attachment: ProviderAttachmentSchema.nullable(),
    ledger_entry_lines: z.array(ProviderLedgerEntryLineSchema)
});

const OutputSchema = z.object({
    id: z.number().int(),
    label: z.string(),
    piece_number: z.string().optional(),
    date: z.string(),
    due_date: z.string().optional(),
    invoice_number: z.string().optional(),
    created_at: z.string(),
    updated_at: z.string(),
    journal: ProviderJournalSchema,
    status: z.string().optional(),
    categories: z.array(ProviderCategorySchema),
    attachment: ProviderAttachmentSchema.optional(),
    ledger_entry_lines: z.array(ProviderLedgerEntryLineSchema)
});

const action = createAction({
    description: 'Retrieve a ledger entry.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ledger_entries:readonly'],

    exec: async (nango, input) => {
        const response = await nango.get({
            // https://pennylane.readme.io/reference/getledgerentry
            endpoint: `/api/external/v2/ledger_entries/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Ledger entry not found',
                id: input.id
            });
        }

        const providerEntry = ProviderLedgerEntrySchema.parse(response.data);

        return {
            id: providerEntry.id,
            label: providerEntry.label,
            ...(providerEntry.piece_number != null && { piece_number: providerEntry.piece_number }),
            date: providerEntry.date,
            ...(providerEntry.due_date != null && { due_date: providerEntry.due_date }),
            ...(providerEntry.invoice_number != null && { invoice_number: providerEntry.invoice_number }),
            created_at: providerEntry.created_at,
            updated_at: providerEntry.updated_at,
            journal: providerEntry.journal,
            ...(providerEntry.status != null && { status: providerEntry.status }),
            categories: providerEntry.categories,
            ...(providerEntry.attachment != null && { attachment: providerEntry.attachment }),
            ledger_entry_lines: providerEntry.ledger_entry_lines
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
