import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    organization_id: z.string().describe('ID of the organization. Example: "927270289"'),
    account_name: z.string().describe('Name of the account. Example: "Corporate Account"'),
    account_type: z.string().describe('Type of the account. Example: "bank", "cash"'),
    account_number: z.string().optional().describe('Number associated with the Bank Account'),
    account_code: z.string().optional().describe('Code of the Account'),
    currency_id: z.string().optional().describe('ID of the Currency associated with the Account'),
    currency_code: z.string().optional().describe('Code of the currency associated with the Bank Account'),
    description: z.string().optional().describe('Description of the Account'),
    bank_name: z.string().optional().describe('Name of the Bank'),
    routing_number: z.string().optional().describe('Routing Number of the Account'),
    is_primary_account: z.boolean().optional().describe('Check if the Account is Primary Account in Zoho Books'),
    is_paypal_account: z.boolean().optional().describe('Check if the Account is Paypal Account'),
    paypal_type: z.string().optional().describe('The type of Payment for the Paypal Account. Allowed Values: standard and adaptive'),
    paypal_email_address: z.string().optional().describe('Email Address of the Paypal account')
});

const ProviderBankAccountSchema = z.object({
    account_id: z.string(),
    account_name: z.string(),
    account_code: z.string().optional().nullable(),
    currency_id: z.string().optional().nullable(),
    currency_code: z.string().optional().nullable(),
    currency_symbol: z.string().optional().nullable(),
    price_precision: z.number().optional().nullable(),
    account_type: z.string(),
    account_number: z.string().optional().nullable(),
    uncategorized_transactions: z.number().optional().nullable(),
    total_unprinted_checks: z.number().optional().nullable(),
    is_active: z.boolean().optional().nullable(),
    is_feeds_subscribed: z.boolean().optional().nullable(),
    is_feeds_active: z.boolean().optional().nullable(),
    balance: z.number().optional().nullable(),
    bank_balance: z.number().optional().nullable(),
    bcy_balance: z.number().optional().nullable(),
    bank_name: z.string().optional().nullable(),
    routing_number: z.string().optional().nullable(),
    is_primary_account: z.boolean().optional().nullable(),
    is_paypal_account: z.boolean().optional().nullable(),
    description: z.string().optional().nullable(),
    is_system_account: z.boolean().optional().nullable()
});

const OutputSchema = z.object({
    account_id: z.string(),
    account_name: z.string(),
    account_code: z.string().optional(),
    currency_id: z.string().optional(),
    currency_code: z.string().optional(),
    currency_symbol: z.string().optional(),
    price_precision: z.number().optional(),
    account_type: z.string(),
    account_number: z.string().optional(),
    uncategorized_transactions: z.number().optional(),
    total_unprinted_checks: z.number().optional(),
    is_active: z.boolean().optional(),
    is_feeds_subscribed: z.boolean().optional(),
    is_feeds_active: z.boolean().optional(),
    balance: z.number().optional(),
    bank_balance: z.number().optional(),
    bcy_balance: z.number().optional(),
    bank_name: z.string().optional(),
    routing_number: z.string().optional(),
    is_primary_account: z.boolean().optional(),
    is_paypal_account: z.boolean().optional(),
    description: z.string().optional(),
    is_system_account: z.boolean().optional()
});

const action = createAction({
    description: 'Create a bank account in Zoho Books.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-bank-account',
        group: 'Bank Accounts'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoBooks.banking.CREATE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://www.zoho.com/books/api/v3/bank-accounts/#create-a-bank-account
            endpoint: '/books/v3/bankaccounts',
            params: {
                organization_id: input.organization_id
            },
            data: {
                account_name: input.account_name,
                account_type: input.account_type,
                ...(input.account_number !== undefined && { account_number: input.account_number }),
                ...(input.account_code !== undefined && { account_code: input.account_code }),
                ...(input.currency_id !== undefined && { currency_id: input.currency_id }),
                ...(input.currency_code !== undefined && { currency_code: input.currency_code }),
                ...(input.description !== undefined && { description: input.description }),
                ...(input.bank_name !== undefined && { bank_name: input.bank_name }),
                ...(input.routing_number !== undefined && { routing_number: input.routing_number }),
                ...(input.is_primary_account !== undefined && { is_primary_account: input.is_primary_account }),
                ...(input.is_paypal_account !== undefined && { is_paypal_account: input.is_paypal_account }),
                ...(input.paypal_type !== undefined && { paypal_type: input.paypal_type }),
                ...(input.paypal_email_address !== undefined && { paypal_email_address: input.paypal_email_address })
            },
            retries: 3
        });

        const responseValidator = z.object({
            code: z.number().optional(),
            message: z.string().optional(),
            bankaccount: z.unknown().optional()
        });

        const parsedResponse = responseValidator.safeParse(response.data);
        if (!parsedResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Zoho Books API.'
            });
        }

        if (parsedResponse.data.code !== undefined && parsedResponse.data.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: parsedResponse.data.message || 'Unknown error from Zoho Books API.',
                code: parsedResponse.data.code
            });
        }

        if (!parsedResponse.data.bankaccount) {
            throw new nango.ActionError({
                type: 'missing_bank_account',
                message: 'The response did not contain a bank account.'
            });
        }

        const bankAccount = ProviderBankAccountSchema.parse(parsedResponse.data.bankaccount);

        return {
            account_id: bankAccount.account_id,
            account_name: bankAccount.account_name,
            account_type: bankAccount.account_type,
            ...(bankAccount.account_code != null && { account_code: bankAccount.account_code }),
            ...(bankAccount.currency_id != null && { currency_id: bankAccount.currency_id }),
            ...(bankAccount.currency_code != null && { currency_code: bankAccount.currency_code }),
            ...(bankAccount.currency_symbol != null && { currency_symbol: bankAccount.currency_symbol }),
            ...(bankAccount.price_precision != null && { price_precision: bankAccount.price_precision }),
            ...(bankAccount.account_number != null && { account_number: bankAccount.account_number }),
            ...(bankAccount.uncategorized_transactions != null && { uncategorized_transactions: bankAccount.uncategorized_transactions }),
            ...(bankAccount.total_unprinted_checks != null && { total_unprinted_checks: bankAccount.total_unprinted_checks }),
            ...(bankAccount.is_active != null && { is_active: bankAccount.is_active }),
            ...(bankAccount.is_feeds_subscribed != null && { is_feeds_subscribed: bankAccount.is_feeds_subscribed }),
            ...(bankAccount.is_feeds_active != null && { is_feeds_active: bankAccount.is_feeds_active }),
            ...(bankAccount.balance != null && { balance: bankAccount.balance }),
            ...(bankAccount.bank_balance != null && { bank_balance: bankAccount.bank_balance }),
            ...(bankAccount.bcy_balance != null && { bcy_balance: bankAccount.bcy_balance }),
            ...(bankAccount.bank_name != null && { bank_name: bankAccount.bank_name }),
            ...(bankAccount.routing_number != null && { routing_number: bankAccount.routing_number }),
            ...(bankAccount.is_primary_account != null && { is_primary_account: bankAccount.is_primary_account }),
            ...(bankAccount.is_paypal_account != null && { is_paypal_account: bankAccount.is_paypal_account }),
            ...(bankAccount.description != null && { description: bankAccount.description }),
            ...(bankAccount.is_system_account != null && { is_system_account: bankAccount.is_system_account })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
