import { z } from 'zod';
import { createAction } from 'nango';

const OrganizationsResponseSchema = z.object({
    code: z.number(),
    organizations: z.array(z.object({ organization_id: z.string() })).optional()
});

const InputSchema = z.object({
    account_id: z.string().describe('The bank account ID. Example: "260815000000102017"'),
    organization_id: z.string().optional().describe('Zoho Books organization ID. If omitted, the first organization ID is fetched from the API.')
});

const ProviderBankAccountSchema = z.object({
    account_id: z.string(),
    account_name: z.string().optional(),
    account_code: z.string().optional(),
    currency_id: z.string().optional(),
    currency_code: z.string().optional(),
    currency_symbol: z.string().optional(),
    price_precision: z.number().optional(),
    account_type: z.string().optional(),
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
    refresh_status: z.string().optional(),
    service_id: z.string().optional(),
    is_system_account: z.boolean().optional(),
    is_show_warning_for_feeds_refresh: z.boolean().optional()
});

const OutputSchema = z.object({
    account_id: z.string(),
    account_name: z.string().optional(),
    account_code: z.string().optional(),
    currency_id: z.string().optional(),
    currency_code: z.string().optional(),
    currency_symbol: z.string().optional(),
    price_precision: z.number().optional(),
    account_type: z.string().optional(),
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
    refresh_status: z.string().optional(),
    service_id: z.string().optional(),
    is_system_account: z.boolean().optional(),
    is_show_warning_for_feeds_refresh: z.boolean().optional()
});

const ProviderResponseSchema = z.object({
    code: z.number(),
    message: z.string().optional(),
    bankaccount: z.unknown()
});

const action = createAction({
    description: 'Retrieve a single bank account from Zoho Books.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-bank-account',
        group: 'Bank Accounts'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoBooks.banking.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let organizationId = input.organization_id;
        if (!organizationId) {
            const orgResponse = await nango.get({
                // https://www.zoho.com/books/api/v3/organizations/#overview
                endpoint: '/books/v3/organizations',
                retries: 3
            });
            const orgData = OrganizationsResponseSchema.parse(orgResponse.data);
            const firstOrg = orgData.organizations?.[0];
            if (orgData.code !== 0 || !firstOrg) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: 'No organizations found for this Zoho Books account.'
                });
            }
            organizationId = firstOrg.organization_id;
        }

        // https://www.zoho.com/books/api/v3/bank-accounts/#get-account-details
        const response = await nango.get({
            endpoint: `/books/v3/bankaccounts/${encodeURIComponent(input.account_id)}`,
            params: {
                organization_id: organizationId
            },
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Zoho Books API.'
            });
        }

        const parsed = ProviderResponseSchema.parse(response.data);

        if (parsed.code !== 0) {
            throw new nango.ActionError({
                type: 'api_error',
                message: parsed.message || 'Zoho Books API returned an error.',
                code: parsed.code
            });
        }

        const bankAccount = ProviderBankAccountSchema.parse(parsed.bankaccount);

        return {
            account_id: bankAccount.account_id,
            ...(bankAccount.account_name !== undefined && { account_name: bankAccount.account_name }),
            ...(bankAccount.account_code !== undefined && { account_code: bankAccount.account_code }),
            ...(bankAccount.currency_id !== undefined && { currency_id: bankAccount.currency_id }),
            ...(bankAccount.currency_code !== undefined && { currency_code: bankAccount.currency_code }),
            ...(bankAccount.currency_symbol !== undefined && { currency_symbol: bankAccount.currency_symbol }),
            ...(bankAccount.price_precision !== undefined && { price_precision: bankAccount.price_precision }),
            ...(bankAccount.account_type !== undefined && { account_type: bankAccount.account_type }),
            ...(bankAccount.account_number !== undefined && { account_number: bankAccount.account_number }),
            ...(bankAccount.uncategorized_transactions !== undefined && { uncategorized_transactions: bankAccount.uncategorized_transactions }),
            ...(bankAccount.total_unprinted_checks !== undefined && { total_unprinted_checks: bankAccount.total_unprinted_checks }),
            ...(bankAccount.is_active !== undefined && { is_active: bankAccount.is_active }),
            ...(bankAccount.is_feeds_subscribed !== undefined && { is_feeds_subscribed: bankAccount.is_feeds_subscribed }),
            ...(bankAccount.is_feeds_active !== undefined && { is_feeds_active: bankAccount.is_feeds_active }),
            ...(bankAccount.balance !== undefined && { balance: bankAccount.balance }),
            ...(bankAccount.bank_balance !== undefined && { bank_balance: bankAccount.bank_balance }),
            ...(bankAccount.bcy_balance !== undefined && { bcy_balance: bankAccount.bcy_balance }),
            ...(bankAccount.bank_name !== undefined && { bank_name: bankAccount.bank_name }),
            ...(bankAccount.routing_number !== undefined && { routing_number: bankAccount.routing_number }),
            ...(bankAccount.is_primary_account !== undefined && { is_primary_account: bankAccount.is_primary_account }),
            ...(bankAccount.is_paypal_account !== undefined && { is_paypal_account: bankAccount.is_paypal_account }),
            ...(bankAccount.description !== undefined && { description: bankAccount.description }),
            ...(bankAccount.refresh_status !== undefined && { refresh_status: bankAccount.refresh_status }),
            ...(bankAccount.service_id !== undefined && { service_id: bankAccount.service_id }),
            ...(bankAccount.is_system_account !== undefined && { is_system_account: bankAccount.is_system_account }),
            ...(bankAccount.is_show_warning_for_feeds_refresh !== undefined && {
                is_show_warning_for_feeds_refresh: bankAccount.is_show_warning_for_feeds_refresh
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
