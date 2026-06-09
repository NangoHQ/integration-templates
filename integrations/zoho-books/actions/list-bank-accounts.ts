import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    organization_id: z.string().describe('Organization ID. Example: "927270289"'),
    page: z.number().optional().describe('Page number to fetch. Defaults to 1.'),
    per_page: z.number().optional().describe('Number of records per page.'),
    filter_by: z.enum(['Status.All', 'Status.Active', 'Status.Inactive']).optional().describe('Filter by account status.'),
    sort_column: z.enum(['account_name', 'account_type', 'account_code']).optional().describe('Column to sort results by.')
});

const ProviderBankAccountSchema = z
    .object({
        account_id: z.string(),
        account_name: z.string(),
        account_code: z.string().optional(),
        currency_id: z.string().optional(),
        currency_code: z.string().optional(),
        currency_symbol: z.string().optional(),
        price_precision: z.number().optional(),
        account_type: z.string(),
        account_sub_type: z.string().optional(),
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
        refresh_status_code: z.string().optional(),
        feeds_last_refresh_date: z.string().optional(),
        service_id: z.string().optional(),
        is_system_account: z.boolean().optional(),
        is_show_warning_for_feeds_refresh: z.boolean().optional(),
        is_direct_paypal: z.boolean().optional(),
        mfa_required: z.boolean().optional(),
        partner_bank_source_formatted: z.string().optional(),
        partner_bank_source: z.string().optional(),
        payout_bank_name: z.string().optional(),
        is_beta_feed: z.boolean().optional(),
        feed_status: z.string().optional(),
        consent_info: z
            .object({
                consent_remaining_days: z.string().optional(),
                is_consent_expired: z.string().optional()
            })
            .optional(),
        paypal_type: z.string().optional(),
        paypal_email_address: z.string().optional()
    })
    .passthrough();

const ProviderPageContextSchema = z.object({
    page: z.number(),
    per_page: z.number(),
    has_more_page: z.boolean(),
    report_name: z.string().optional(),
    applied_filter: z.string().optional(),
    sort_column: z.string().optional(),
    sort_order: z.string().optional()
});

const ProviderResponseSchema = z.object({
    code: z.number(),
    message: z.string(),
    bankaccounts: z.array(ProviderBankAccountSchema),
    page_context: ProviderPageContextSchema.optional()
});

const BankAccountSchema = z.object({
    account_id: z.string(),
    account_name: z.string(),
    account_code: z.string().optional(),
    currency_id: z.string().optional(),
    currency_code: z.string().optional(),
    currency_symbol: z.string().optional(),
    price_precision: z.number().optional(),
    account_type: z.string(),
    account_sub_type: z.string().optional(),
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
    refresh_status_code: z.string().optional(),
    feeds_last_refresh_date: z.string().optional(),
    service_id: z.string().optional(),
    is_system_account: z.boolean().optional(),
    is_show_warning_for_feeds_refresh: z.boolean().optional(),
    is_direct_paypal: z.boolean().optional(),
    mfa_required: z.boolean().optional(),
    partner_bank_source_formatted: z.string().optional(),
    partner_bank_source: z.string().optional(),
    payout_bank_name: z.string().optional(),
    is_beta_feed: z.boolean().optional(),
    feed_status: z.string().optional(),
    consent_info: z
        .object({
            consent_remaining_days: z.string().optional(),
            is_consent_expired: z.string().optional()
        })
        .optional(),
    paypal_type: z.string().optional(),
    paypal_email_address: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(BankAccountSchema),
    next_page: z.number().optional()
});

const action = createAction({
    description: 'List bank accounts from Zoho Books.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/list-bank-accounts',
        group: 'Bank Accounts'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoBooks.banking.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params = {
            organization_id: input.organization_id,
            ...(input.page !== undefined && { page: input.page }),
            ...(input.per_page !== undefined && { per_page: input.per_page }),
            ...(input.filter_by !== undefined && { filter_by: input.filter_by }),
            ...(input.sort_column !== undefined && { sort_column: input.sort_column })
        };

        const response = await nango.get({
            // https://www.zoho.com/books/api/v3/bank-accounts/#list-view-of-accounts
            endpoint: '/books/v3/bankaccounts',
            params,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const items = providerResponse.bankaccounts.map((account) => ({
            account_id: account.account_id,
            account_name: account.account_name,
            ...(account.account_code !== undefined && { account_code: account.account_code }),
            ...(account.currency_id !== undefined && { currency_id: account.currency_id }),
            ...(account.currency_code !== undefined && { currency_code: account.currency_code }),
            ...(account.currency_symbol !== undefined && { currency_symbol: account.currency_symbol }),
            ...(account.price_precision !== undefined && { price_precision: account.price_precision }),
            account_type: account.account_type,
            ...(account.account_sub_type !== undefined && { account_sub_type: account.account_sub_type }),
            ...(account.account_number !== undefined && { account_number: account.account_number }),
            ...(account.uncategorized_transactions !== undefined && { uncategorized_transactions: account.uncategorized_transactions }),
            ...(account.total_unprinted_checks !== undefined && { total_unprinted_checks: account.total_unprinted_checks }),
            ...(account.is_active !== undefined && { is_active: account.is_active }),
            ...(account.is_feeds_subscribed !== undefined && { is_feeds_subscribed: account.is_feeds_subscribed }),
            ...(account.is_feeds_active !== undefined && { is_feeds_active: account.is_feeds_active }),
            ...(account.balance !== undefined && { balance: account.balance }),
            ...(account.bank_balance !== undefined && { bank_balance: account.bank_balance }),
            ...(account.bcy_balance !== undefined && { bcy_balance: account.bcy_balance }),
            ...(account.bank_name !== undefined && { bank_name: account.bank_name }),
            ...(account.routing_number !== undefined && { routing_number: account.routing_number }),
            ...(account.is_primary_account !== undefined && { is_primary_account: account.is_primary_account }),
            ...(account.is_paypal_account !== undefined && { is_paypal_account: account.is_paypal_account }),
            ...(account.description !== undefined && { description: account.description }),
            ...(account.refresh_status_code !== undefined && { refresh_status_code: account.refresh_status_code }),
            ...(account.feeds_last_refresh_date !== undefined && { feeds_last_refresh_date: account.feeds_last_refresh_date }),
            ...(account.service_id !== undefined && { service_id: account.service_id }),
            ...(account.is_system_account !== undefined && { is_system_account: account.is_system_account }),
            ...(account.is_show_warning_for_feeds_refresh !== undefined && { is_show_warning_for_feeds_refresh: account.is_show_warning_for_feeds_refresh }),
            ...(account.is_direct_paypal !== undefined && { is_direct_paypal: account.is_direct_paypal }),
            ...(account.mfa_required !== undefined && { mfa_required: account.mfa_required }),
            ...(account.partner_bank_source_formatted !== undefined && { partner_bank_source_formatted: account.partner_bank_source_formatted }),
            ...(account.partner_bank_source !== undefined && { partner_bank_source: account.partner_bank_source }),
            ...(account.payout_bank_name !== undefined && { payout_bank_name: account.payout_bank_name }),
            ...(account.is_beta_feed !== undefined && { is_beta_feed: account.is_beta_feed }),
            ...(account.feed_status !== undefined && { feed_status: account.feed_status }),
            ...(account.consent_info !== undefined && { consent_info: account.consent_info }),
            ...(account.paypal_type !== undefined && { paypal_type: account.paypal_type }),
            ...(account.paypal_email_address !== undefined && { paypal_email_address: account.paypal_email_address })
        }));

        return {
            items,
            ...(providerResponse.page_context !== undefined &&
                providerResponse.page_context.has_more_page && {
                    next_page: providerResponse.page_context.page + 1
                })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
