import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        bank_account_id: z
            .string()
            .describe('The unique identifier of the externally-linked bank account to retrieve. Example: "9128effa-03f6-4302-b895-3468ab319cd2"')
    })
    .describe('Input for retrieving a single externally-linked bank account by ID.');

const ProviderBankAccountSchema = z.object({
    id: z.string(),
    account_name: z.string(),
    account_number_last_four: z.string(),
    account_subtype: z.string(),
    connection_provider: z.string(),
    financial_institution_name: z.string().nullable(),
    has_ach_details: z.boolean()
});

const OutputSchema = z
    .object({
        id: z.string().describe('Unique identifier of the bank account.'),
        account_name: z.string().describe('Name of the bank account. Example: "Brown Ltd"'),
        account_number_last_four: z.string().describe('Last four digits of the account number. Example: "6653"'),
        account_subtype: z.string().describe('Bank account subtype. Example: "checking"'),
        connection_provider: z
            .string()
            .describe('How the bank account was connected. One of "finicity", "manual", "plaid", "ramp_brokerage", "ramp_wallet" or "teller".'),
        financial_institution_name: z.string().nullable().describe('Name of the associated financial institution, or null when unknown.'),
        has_ach_details: z.boolean().describe('Whether Ramp holds ACH routing and account numbers for the bank account.')
    })
    .describe('A single externally-linked bank account.');

/**
 * @tags: [read]
 * @tagReason: Retrieves a single externally-linked bank account without modifying any provider state.
 * @pitfalls: Returns externally-linked bank accounts (connection_provider such as "manual", "plaid" or "ramp_wallet") that carry no balance data; Treasury/business account balances live in a separate banking resource, and financial_institution_name is frequently null.
 */
const action = createAction({
    description: 'Retrieve a single externally-linked bank account by ID.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['bank_accounts'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.ramp.com/openapi/developer-api.json (GET /developer/v1/bank-accounts/{bank_account_id})
            endpoint: `/developer/v1/bank-accounts/${encodeURIComponent(input.bank_account_id)}`,
            retries: 3
        });

        const bankAccount = ProviderBankAccountSchema.parse(response.data);

        return {
            id: bankAccount.id,
            account_name: bankAccount.account_name,
            account_number_last_four: bankAccount.account_number_last_four,
            account_subtype: bankAccount.account_subtype,
            connection_provider: bankAccount.connection_provider,
            financial_institution_name: bankAccount.financial_institution_name,
            has_ach_details: bankAccount.has_ach_details
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
