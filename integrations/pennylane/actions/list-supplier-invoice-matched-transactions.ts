import { createAction } from 'nango';
import { z } from 'zod';

const InputSchema = z.object({
    supplier_invoice_id: z.string().describe('Supplier invoice ID. Example: "25465510096896"'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().int().min(1).max(100).optional().describe('Number of items per page. Defaults to 20.')
});

const ProviderBankAccountSchema = z.object({
    id: z.number(),
    url: z.string()
});

const ProviderSupplierSchema = z.object({
    id: z.number(),
    url: z.string()
});

const ProviderJournalSchema = z.object({
    id: z.number()
});

const ProviderMatchedTransactionSchema = z.object({
    id: z.number(),
    amount: z.string(),
    archived_at: z.string().nullable(),
    attachment_required: z.boolean(),
    created_at: z.string(),
    currency_amount: z.string(),
    currency_fee: z.string().nullable(),
    currency: z.string(),
    date: z.string(),
    fee: z.string().nullable(),
    label: z.string(),
    outstanding_balance: z.string(),
    updated_at: z.string(),
    journal: ProviderJournalSchema,
    bank_account: ProviderBankAccountSchema,
    pro_account_expense: z.unknown().nullable(),
    supplier: ProviderSupplierSchema.nullable(),
    categories: z.array(z.unknown())
});

const ProviderResponseSchema = z.object({
    items: z.array(ProviderMatchedTransactionSchema),
    has_more: z.boolean(),
    next_cursor: z.string().nullable()
});

const MatchedTransactionSchema = z.object({
    id: z.number(),
    amount: z.string(),
    archived_at: z.string().optional(),
    attachment_required: z.boolean(),
    created_at: z.string(),
    currency_amount: z.string(),
    currency_fee: z.string().optional(),
    currency: z.string(),
    date: z.string(),
    fee: z.string().optional(),
    label: z.string(),
    outstanding_balance: z.string(),
    updated_at: z.string(),
    journal: ProviderJournalSchema,
    bank_account: ProviderBankAccountSchema,
    supplier: ProviderSupplierSchema.optional(),
    categories: z.array(z.unknown())
});

const OutputSchema = z.object({
    items: z.array(MatchedTransactionSchema),
    has_more: z.boolean(),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List transactions matched to a supplier invoice.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['supplier_invoices:readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://pennylane.readme.io/reference/getsupplierinvoicematchedtransactions
            endpoint: `/api/external/v2/supplier_invoices/${encodeURIComponent(input.supplier_invoice_id)}/matched_transactions`,
            params: {
                ...(input.cursor !== undefined && { cursor: input.cursor }),
                ...(input.limit !== undefined && { limit: String(input.limit) })
            },
            retries: 3
        });

        const parsedResponse = ProviderResponseSchema.parse(response.data);

        return {
            items: parsedResponse.items.map((item) => ({
                id: item.id,
                amount: item.amount,
                ...(item.archived_at != null && { archived_at: item.archived_at }),
                attachment_required: item.attachment_required,
                created_at: item.created_at,
                currency_amount: item.currency_amount,
                ...(item.currency_fee != null && { currency_fee: item.currency_fee }),
                currency: item.currency,
                date: item.date,
                ...(item.fee != null && { fee: item.fee }),
                label: item.label,
                outstanding_balance: item.outstanding_balance,
                updated_at: item.updated_at,
                journal: item.journal,
                bank_account: item.bank_account,
                ...(item.supplier != null && { supplier: item.supplier }),
                categories: item.categories
            })),
            has_more: parsedResponse.has_more,
            ...(parsedResponse.next_cursor != null && { next_cursor: parsedResponse.next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
