import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of items to return per request. Defaults to 20 if not specified. Must be between 1 and 100.')
});

const BankEstablishmentSchema = z.object({
    id: z.number().describe('Bank establishment ID')
});

const LinkedJournalSchema = z.object({
    id: z.number().describe('Journal ID'),
    url: z.string().describe('API URL to fetch the journal')
});

const LinkedLedgerAccountSchema = z.object({
    id: z.number().describe('Ledger account ID'),
    url: z.string().describe('API URL to fetch the ledger account')
});

const BankAccountSchema = z.object({
    id: z.number().describe('Bank account ID. Example: 14569345024'),
    name: z.string().describe('The name of the bank account'),
    currency: z.string().optional().describe('Currency of the bank account'),
    balance: z.string().optional().describe('Current balance as a string'),
    created_at: z.string().optional().describe('ISO 8601 timestamp when the account was created'),
    updated_at: z.string().optional().describe('ISO 8601 timestamp when the account was last updated'),
    iban: z.string().optional().describe('International Bank Account Number'),
    bic: z.string().optional().describe('Bank Identifier Code'),
    account_type: z.string().optional().describe('Account type (e.g. checking, savings, loan, life_insurance, other)'),
    bank_establishment: BankEstablishmentSchema.optional().describe('Associated bank establishment'),
    journal: LinkedJournalSchema.optional().describe('Associated journal'),
    ledger_account: LinkedLedgerAccountSchema.optional().describe('Associated ledger account')
});

const ProviderResponseSchema = z.object({
    items: z.array(BankAccountSchema),
    has_more: z.boolean().describe('Whether more pages exist'),
    next_cursor: z.string().nullable().describe('Cursor for the next page of results')
});

const OutputSchema = z.object({
    items: z.array(BankAccountSchema),
    has_more: z.boolean().describe('Whether more pages exist'),
    next_cursor: z.string().optional().describe('Cursor for the next page of results')
});

const action = createAction({
    description: 'List bank accounts',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['bank_accounts:readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://pennylane.readme.io/reference/getbankaccounts
            endpoint: '/bank_accounts',
            params: {
                ...(input.cursor !== undefined && { cursor: input.cursor }),
                ...(input.limit !== undefined && { limit: String(input.limit) })
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            items: parsed.items,
            has_more: parsed.has_more,
            ...(parsed.next_cursor !== null && { next_cursor: parsed.next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
