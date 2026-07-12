import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Bank account ID. Example: "42"')
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
        .nullable()
        .optional(),
    ledger_account: z.object({
        id: z.number(),
        url: z.string()
    })
});

const action = createAction({
    description: 'Retrieve a bank account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['bank_accounts:readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://pennylane.readme.io/reference/getbankaccount
            endpoint: `/api/external/v2/bank_accounts/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Bank account not found',
                id: input.id
            });
        }

        const providerBankAccount = ProviderBankAccountSchema.parse(response.data);

        return {
            id: providerBankAccount.id,
            name: providerBankAccount.name,
            currency: providerBankAccount.currency,
            balance: providerBankAccount.balance,
            created_at: providerBankAccount.created_at,
            updated_at: providerBankAccount.updated_at,
            bank_establishment: providerBankAccount.bank_establishment,
            ...(providerBankAccount.journal != null && { journal: providerBankAccount.journal }),
            ledger_account: providerBankAccount.ledger_account
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
