import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    bank_account_id: z.number().describe('The bank account where the transaction is registered. Example: 42'),
    label: z.string().describe('Transaction label. Example: "test label"'),
    date: z.string().describe('Transaction date. Example: "2025-07-30"'),
    amount: z.string().describe('Transaction amount. Example: "120.00"'),
    fee: z.string().optional().describe('Transaction fee. Example: "12.00"')
});

const ProviderTransactionSchema = z.object({
    id: z.number(),
    label: z.string().nullable(),
    attachment_required: z.boolean(),
    date: z.string(),
    outstanding_balance: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string(),
    archived_at: z.string().nullable(),
    currency: z.string().nullable(),
    currency_amount: z.string(),
    amount: z.string(),
    currency_fee: z.string().nullable(),
    fee: z.string().nullable(),
    journal: z.object({
        id: z.number(),
        url: z.string()
    }),
    bank_account: z.object({
        id: z.number(),
        url: z.string()
    }),
    pro_account_expense: z
        .object({
            employee: z
                .object({
                    id: z.number(),
                    first_name: z.string(),
                    last_name: z.string()
                })
                .nullable(),
            card_masked_number: z.string()
        })
        .nullable()
        .optional(),
    customer: z
        .object({
            id: z.number(),
            url: z.string()
        })
        .nullable()
        .optional(),
    supplier: z
        .object({
            id: z.number(),
            url: z.string()
        })
        .nullable()
        .optional(),
    categories: z.array(z.unknown()),
    matched_invoices: z.object({
        url: z.string()
    }),
    interbank_code: z.string().nullable()
});

const OutputSchema = z.object({
    id: z.string().describe('Transaction identifier. Example: "42"'),
    label: z.string().optional(),
    attachment_required: z.boolean(),
    date: z.string(),
    outstanding_balance: z.string().optional(),
    created_at: z.string(),
    updated_at: z.string(),
    archived_at: z.string().optional(),
    currency: z.string().optional(),
    currency_amount: z.string(),
    amount: z.string(),
    currency_fee: z.string().optional(),
    fee: z.string().optional(),
    journal_id: z.number(),
    bank_account_id: z.number(),
    interbank_code: z.string().optional()
});

const action = createAction({
    description: 'Create a bank transaction.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['transactions:all'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://pennylane.readme.io/reference/createtransaction
            endpoint: '/api/external/v2/transactions',
            data: {
                bank_account_id: input.bank_account_id,
                label: input.label,
                date: input.date,
                amount: input.amount,
                ...(input.fee !== undefined && { fee: input.fee })
            },
            retries: 3
        });

        const providerTransaction = ProviderTransactionSchema.parse(response.data);

        return {
            id: String(providerTransaction.id),
            ...(providerTransaction.label != null && { label: providerTransaction.label }),
            attachment_required: providerTransaction.attachment_required,
            date: providerTransaction.date,
            ...(providerTransaction.outstanding_balance != null && {
                outstanding_balance: providerTransaction.outstanding_balance
            }),
            created_at: providerTransaction.created_at,
            updated_at: providerTransaction.updated_at,
            ...(providerTransaction.archived_at != null && { archived_at: providerTransaction.archived_at }),
            ...(providerTransaction.currency != null && { currency: providerTransaction.currency }),
            currency_amount: providerTransaction.currency_amount,
            amount: providerTransaction.amount,
            ...(providerTransaction.currency_fee != null && {
                currency_fee: providerTransaction.currency_fee
            }),
            ...(providerTransaction.fee != null && { fee: providerTransaction.fee }),
            journal_id: providerTransaction.journal.id,
            bank_account_id: providerTransaction.bank_account.id,
            ...(providerTransaction.interbank_code != null && {
                interbank_code: providerTransaction.interbank_code
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
