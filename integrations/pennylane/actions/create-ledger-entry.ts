import { z } from 'zod';
import { createAction } from 'nango';

const LedgerEntryLineInputSchema = z.object({
    debit: z.string().describe('Debit amount for the entry line. Example: "100.00"'),
    credit: z.string().describe('Credit amount for the entry line. Example: "0.00"'),
    ledger_account_id: z.number().describe('Ledger account ID. Example: 987'),
    label: z.string().optional().describe('Label that describes the entry line. Example: "Transaction label"')
});

const InputSchema = z.object({
    date: z.string().describe('Date of the ledger entry (ISO 8601). Example: "2023-08-30"'),
    due_date: z.string().optional().nullable().describe('Due date of the ledger entry (ISO 8601). Example: "2023-09-30"'),
    label: z.string().describe('Label that describes the ledger entry. Example: "Payment for Services"'),
    journal_id: z.number().describe('The journal ID where you want to create the ledger entry. Example: 123'),
    ledger_attachment_id: z.number().optional().nullable().describe('Ledger attachment ID (deprecated).'),
    file_attachment_id: z.number().optional().nullable().describe('File attachment ID (replaces deprecated ledger_attachment_id). Example: 42'),
    currency: z.string().optional().describe('Currency code of the ledger entry as per ISO 4217. Example: "EUR"'),
    piece_number: z.string().optional().describe('A piece number you can provide to track this ledger entry. Example: "TENSNYLUGV"'),
    ledger_entry_lines: z
        .array(LedgerEntryLineInputSchema)
        .min(1)
        .describe('Array of ledger entry lines. The entry lines must be balanced. Max 1000 per request.')
});

const JournalSchema = z.object({
    id: z.number(),
    url: z.string()
});

const CategoryGroupSchema = z.object({
    id: z.number()
});

const CategorySchema = z.object({
    id: z.number(),
    label: z.string(),
    weight: z.string(),
    category_group: CategoryGroupSchema,
    analytical_code: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string()
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
    ledger_account_id: z.number(),
    ledger_account: LedgerAccountSchema,
    label: z.string()
});

const AttachmentSchema = z
    .object({
        filename: z.string(),
        url: z.string()
    })
    .nullable();

const OutputSchema = z.object({
    id: z.number(),
    label: z.string(),
    piece_number: z.string().nullable().optional(),
    date: z.string(),
    due_date: z.string().nullable().optional(),
    invoice_number: z.string().nullable().optional(),
    journal_id: z.number().optional(),
    journal: JournalSchema,
    status: z.string().nullable().optional(),
    categories: z.array(CategorySchema),
    ledger_attachment_filename: z.string().nullable().optional(),
    ledger_attachment_id: z.number().nullable().optional(),
    attachment: AttachmentSchema,
    ledger_entry_lines: z.array(LedgerEntryLineSchema)
});

const action = createAction({
    description: 'Create a balanced ledger entry.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ledger_entries:all'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const totalDebit = input.ledger_entry_lines.reduce((sum, line) => {
            const value = parseFloat(line.debit || '0');
            return sum + value;
        }, 0);

        const totalCredit = input.ledger_entry_lines.reduce((sum, line) => {
            const value = parseFloat(line.credit || '0');
            return sum + value;
        }, 0);

        if (totalDebit !== totalCredit) {
            throw new nango.ActionError({
                type: 'unbalanced_entry',
                message: 'Ledger entry lines are not balanced. Total debit must equal total credit.',
                total_debit: totalDebit.toFixed(2),
                total_credit: totalCredit.toFixed(2)
            });
        }

        const response = await nango.post({
            // https://pennylane.readme.io/reference/postledgerentries
            endpoint: '/api/external/v2/ledger_entries',
            data: {
                date: input.date,
                label: input.label,
                journal_id: input.journal_id,
                ledger_entry_lines: input.ledger_entry_lines.map((line) => ({
                    debit: line.debit,
                    credit: line.credit,
                    ledger_account_id: line.ledger_account_id,
                    ...(line.label !== undefined && { label: line.label })
                })),
                ...(input.due_date !== undefined && input.due_date !== null && { due_date: input.due_date }),
                ...(input.ledger_attachment_id !== undefined && input.ledger_attachment_id !== null && { ledger_attachment_id: input.ledger_attachment_id }),
                ...(input.file_attachment_id !== undefined && input.file_attachment_id !== null && { file_attachment_id: input.file_attachment_id }),
                ...(input.currency !== undefined && { currency: input.currency }),
                ...(input.piece_number !== undefined && { piece_number: input.piece_number })
            },
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const parsed = OutputSchema.parse(response.data);
        return parsed;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
