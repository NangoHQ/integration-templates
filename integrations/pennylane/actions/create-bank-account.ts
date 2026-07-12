import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('The name of the bank account. Example: "Main Account"'),
    bank_establishment_id: z.number().optional().describe('ID of the bank establishment. If not provided, Other establishment will be used. Example: 25'),
    iban: z.string().optional().describe('International Bank Account Number. Example: "FR1420041010050500013M02606"'),
    bic: z.string().optional().describe('Bank Identifier Code. Example: "BNPAFRPPXXX"'),
    currency: z.string().optional().describe('Currency code. Defaults to EUR. Example: "EUR"'),
    account_type: z
        .enum(['current', 'card', 'savings', 'shares', 'loan', 'life_insurance', 'other', 'checking'])
        .optional()
        .describe('Type of bank account. Note: current is deprecated; use checking instead.')
});

const ProviderBankAccountSchema = z.object({
    id: z.number(),
    name: z.string(),
    currency: z.string(),
    balance: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    bank_establishment: z.object({
        id: z.number()
    }),
    journal: z
        .object({
            id: z.number(),
            url: z.string()
        })
        .nullable(),
    ledger_account: z.object({
        id: z.number(),
        url: z.string()
    })
});

const OutputSchema = z.object({
    id: z.number().describe('The bank account ID. Example: 42'),
    name: z.string().describe('The name of the bank account. Example: "Main account"'),
    currency: z.string().describe('Currency code. Example: "EUR"'),
    balance: z.string().describe('Account balance. Example: "100.15"'),
    created_at: z.string().describe('Creation timestamp. Example: "2023-08-30T10:08:08.146343Z"'),
    updated_at: z.string().describe('Last update timestamp. Example: "2023-08-30T10:08:08.146343Z"'),
    bank_establishment_id: z.number().describe('Bank establishment ID. Example: 42'),
    journal_id: z.number().optional().describe('Journal ID. Example: 42'),
    journal_url: z.string().optional().describe('Journal URL. Example: "https://app.pennylane.com/api/external/v2/journals/7"'),
    ledger_account_id: z.number().describe('Ledger account ID. Example: 42'),
    ledger_account_url: z.string().describe('Ledger account URL. Example: "https://app.pennylane.com/api/external/v2/ledger_accounts/8"')
});

const action = createAction({
    description: 'Create a bank account',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['bank_accounts:all'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const payload: Record<string, unknown> = {
            name: input.name
        };

        if (input.bank_establishment_id !== undefined) {
            payload['bank_establishment_id'] = input.bank_establishment_id;
        }
        if (input.iban !== undefined) {
            payload['iban'] = input.iban;
        }
        if (input.bic !== undefined) {
            payload['bic'] = input.bic;
        }
        if (input.currency !== undefined) {
            payload['currency'] = input.currency;
        }
        if (input.account_type !== undefined) {
            payload['account_type'] = input.account_type;
        }

        const response = await nango.post({
            // https://pennylane.readme.io/reference/postbankaccount
            endpoint: '/api/external/v2/bank_accounts',
            data: payload,
            retries: 3
        });

        const bankAccount = ProviderBankAccountSchema.parse(response.data);

        return {
            id: bankAccount.id,
            name: bankAccount.name,
            currency: bankAccount.currency,
            balance: bankAccount.balance,
            created_at: bankAccount.created_at,
            updated_at: bankAccount.updated_at,
            bank_establishment_id: bankAccount.bank_establishment.id,
            ...(bankAccount.journal != null && {
                journal_id: bankAccount.journal.id,
                journal_url: bankAccount.journal.url
            }),
            ledger_account_id: bankAccount.ledger_account.id,
            ledger_account_url: bankAccount.ledger_account.url
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
