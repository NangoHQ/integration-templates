import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The unique identifier of the ledger entry. Example: "123"'),
    date: z.string().optional().describe('Date of the ledger entry (ISO 8601). Example: "2023-08-30"'),
    label: z.string().optional().describe('Label that describes the ledger entry. Example: "Payment for Services"'),
    journal_id: z.number().optional().describe('The journal ID where you want to create the ledger entry. Example: 123'),
    file_attachment_id: z.number().optional().describe('File attachment ID (replaces deprecated ledger_attachment_id). Example: 42'),
    currency: z.string().optional().describe('Currency code of the ledger entry as per ISO 4217. Example: "EUR"'),
    piece_number: z.string().optional().describe('The piece number that was assigned during creation either by you or Pennylane. Example: "TENSNYLUGV"'),
    ledger_entry_lines: z
        .object({
            create: z
                .array(
                    z.object({
                        debit: z.string().describe('Debit amount for the entry line. Example: "100.00"'),
                        credit: z.string().describe('Credit amount for the entry line. Example: "0.00"'),
                        ledger_account_id: z.number().describe('Ledger account ID. Example: 987'),
                        label: z.string().optional().describe('Label that describes the entry line. Example: "Transaction label"')
                    })
                )
                .optional(),
            update: z
                .array(
                    z.object({
                        id: z.number().describe('ID of the entry line. Example: 42'),
                        debit: z.string().optional().describe('Debit amount for the entry line. Example: "100.00"'),
                        credit: z.string().optional().describe('Credit amount for the entry line. Example: "0.00"'),
                        ledger_account_id: z.number().optional().describe('Ledger account ID. Example: 421'),
                        label: z.string().optional().describe('Label that describes the entry line. Example: "Transaction label"')
                    })
                )
                .optional(),
            delete: z
                .array(
                    z.object({
                        id: z.number().describe('ID of the entry line. Example: 42')
                    })
                )
                .optional()
        })
        .optional()
        .describe('Add, update, delete ledger entry lines. The entry lines must be balanced.')
});

const JournalSchema = z.object({
    id: z.number(),
    url: z.string()
});

const LedgerAccountSchema = z.object({
    id: z.number(),
    number: z.string(),
    url: z.string()
});

const LedgerEntryLineSchema = z.object({
    id: z.number(),
    debit: z.string(),
    credit: z.string(),
    ledger_account_id: z.number().nullable(),
    ledger_account: LedgerAccountSchema,
    label: z.string()
});

const CategorySchema = z.object({
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

const AttachmentSchema = z.object({
    filename: z.string(),
    url: z.string()
});

const ProviderLedgerEntrySchema = z.object({
    id: z.number(),
    label: z.string(),
    piece_number: z.string().nullable(),
    date: z.string(),
    due_date: z.string().nullable(),
    invoice_number: z.string().nullable(),
    journal_id: z.number().nullable(),
    journal: JournalSchema,
    status: z.enum(['accounting_needed', 'archived', 'complete', 'draft', 'entry', 'validation_needed', 'waiting_details']).nullable(),
    categories: z.array(CategorySchema),
    ledger_attachment_filename: z.string().nullable(),
    ledger_attachment_id: z.number().nullable(),
    attachment: AttachmentSchema.nullable(),
    ledger_entry_lines: z.array(LedgerEntryLineSchema)
});

const OutputSchema = z.object({
    id: z.number(),
    label: z.string(),
    piece_number: z.string().optional(),
    date: z.string(),
    due_date: z.string().optional(),
    invoice_number: z.string().optional(),
    journal_id: z.number().optional(),
    journal: z.object({
        id: z.number(),
        url: z.string()
    }),
    status: z.enum(['accounting_needed', 'archived', 'complete', 'draft', 'entry', 'validation_needed', 'waiting_details']).optional(),
    categories: z.array(
        z.object({
            id: z.number(),
            label: z.string(),
            weight: z.string(),
            category_group: z.object({
                id: z.number()
            }),
            analytical_code: z.string().optional(),
            created_at: z.string(),
            updated_at: z.string()
        })
    ),
    ledger_attachment_filename: z.string().optional(),
    ledger_attachment_id: z.number().optional(),
    attachment: z
        .object({
            filename: z.string(),
            url: z.string()
        })
        .optional(),
    ledger_entry_lines: z.array(
        z.object({
            id: z.number(),
            debit: z.string(),
            credit: z.string(),
            ledger_account_id: z.number().optional(),
            ledger_account: z.object({
                id: z.number(),
                number: z.string(),
                url: z.string()
            }),
            label: z.string()
        })
    )
});

function normalizeLedgerEntry(providerEntry: z.infer<typeof ProviderLedgerEntrySchema>): z.infer<typeof OutputSchema> {
    return {
        id: providerEntry.id,
        label: providerEntry.label,
        date: providerEntry.date,
        journal: providerEntry.journal,
        categories: providerEntry.categories.map((category) => ({
            id: category.id,
            label: category.label,
            weight: category.weight,
            category_group: category.category_group,
            ...(category.analytical_code != null && { analytical_code: category.analytical_code }),
            created_at: category.created_at,
            updated_at: category.updated_at
        })),
        ledger_entry_lines: providerEntry.ledger_entry_lines.map((line) => ({
            id: line.id,
            debit: line.debit,
            credit: line.credit,
            ledger_account: line.ledger_account,
            label: line.label,
            ...(line.ledger_account_id != null && { ledger_account_id: line.ledger_account_id })
        })),
        ...(providerEntry.piece_number != null && { piece_number: providerEntry.piece_number }),
        ...(providerEntry.due_date != null && { due_date: providerEntry.due_date }),
        ...(providerEntry.invoice_number != null && { invoice_number: providerEntry.invoice_number }),
        ...(providerEntry.journal_id != null && { journal_id: providerEntry.journal_id }),
        ...(providerEntry.status != null && { status: providerEntry.status }),
        ...(providerEntry.ledger_attachment_filename != null && { ledger_attachment_filename: providerEntry.ledger_attachment_filename }),
        ...(providerEntry.ledger_attachment_id != null && { ledger_attachment_id: providerEntry.ledger_attachment_id }),
        ...(providerEntry.attachment != null && { attachment: providerEntry.attachment })
    };
}

const action = createAction({
    description: 'Update a ledger entry.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ledger_entries:all'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: Record<string, unknown> = {};

        if (input.date !== undefined) {
            data['date'] = input.date;
        }
        if (input.label !== undefined) {
            data['label'] = input.label;
        }
        if (input.journal_id !== undefined) {
            data['journal_id'] = input.journal_id;
        }
        if (input.file_attachment_id !== undefined) {
            data['file_attachment_id'] = input.file_attachment_id;
        }
        if (input.currency !== undefined) {
            data['currency'] = input.currency;
        }
        if (input.piece_number !== undefined) {
            data['piece_number'] = input.piece_number;
        }
        if (input.ledger_entry_lines !== undefined) {
            data['ledger_entry_lines'] = input.ledger_entry_lines;
        }

        const response = await nango.put({
            // https://pennylane.readme.io/reference/putledgerentries
            endpoint: `/api/external/v2/ledger_entries/${encodeURIComponent(input.id)}`,
            data,
            retries: 10
        });

        const providerEntry = ProviderLedgerEntrySchema.parse(response.data);

        return normalizeLedgerEntry(providerEntry);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
