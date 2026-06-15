import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const BankAccountSchema = z.object({
    id: z.string(),
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
    refresh_status_code: z.string().optional(),
    feeds_last_refresh_date: z.string().optional(),
    service_id: z.string().optional(),
    is_system_account: z.boolean().optional(),
    is_show_warning_for_feeds_refresh: z.boolean().optional()
});

const MetadataSchema = z.object({
    organization_id: z.string()
});

const BankAccountItemSchema = z.object({
    account_id: z.string(),
    account_name: z.string().optional().nullable(),
    account_code: z.string().optional().nullable(),
    currency_id: z.string().optional().nullable(),
    currency_code: z.string().optional().nullable(),
    currency_symbol: z.string().optional().nullable(),
    price_precision: z.number().optional().nullable(),
    account_type: z.string().optional().nullable(),
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
    refresh_status_code: z.string().optional().nullable(),
    feeds_last_refresh_date: z.string().optional().nullable(),
    service_id: z.string().optional().nullable(),
    is_system_account: z.boolean().optional().nullable(),
    is_show_warning_for_feeds_refresh: z.boolean().optional().nullable()
});

const sync = createSync({
    description: 'Sync bank accounts from Zoho Books.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    models: {
        BankAccount: BankAccountSchema
    },
    endpoints: [
        {
            method: 'POST',
            path: '/syncs/bank-accounts'
        }
    ],

    exec: async (nango) => {
        const metadata = await nango.getMetadata<z.infer<typeof MetadataSchema>>();

        if (!metadata?.organization_id) {
            throw new Error('organization_id is required in metadata');
        }

        // Blocker: the Zoho Books /bankaccounts list endpoint only supports page/per_page
        // pagination and does not expose changed-since filters, cursors, or a deleted-record
        // endpoint. Full refresh is required.
        await nango.trackDeletesStart('BankAccount');

        const proxyConfig: ProxyConfiguration = {
            // https://www.zoho.com/books/api/v3/bank-accounts/#list-view-of-accounts
            endpoint: '/books/v3/bankaccounts',
            params: {
                organization_id: metadata.organization_id
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 100,
                response_path: 'bankaccounts'
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const items = page;

            if (items.length === 0) {
                continue;
            }

            const records = items.map((item: unknown) => {
                const parsedItem = BankAccountItemSchema.safeParse(item);
                if (!parsedItem.success) {
                    throw new Error(`Failed to parse bank account item: ${parsedItem.error.message}`);
                }

                const account = parsedItem.data;
                return {
                    id: account.account_id,
                    ...(account.account_name != null && { account_name: account.account_name }),
                    ...(account.account_code != null && { account_code: account.account_code }),
                    ...(account.currency_id != null && { currency_id: account.currency_id }),
                    ...(account.currency_code != null && { currency_code: account.currency_code }),
                    ...(account.currency_symbol != null && { currency_symbol: account.currency_symbol }),
                    ...(account.price_precision != null && { price_precision: account.price_precision }),
                    ...(account.account_type != null && { account_type: account.account_type }),
                    ...(account.account_number != null && { account_number: account.account_number }),
                    ...(account.uncategorized_transactions != null && { uncategorized_transactions: account.uncategorized_transactions }),
                    ...(account.total_unprinted_checks != null && { total_unprinted_checks: account.total_unprinted_checks }),
                    ...(account.is_active != null && { is_active: account.is_active }),
                    ...(account.is_feeds_subscribed != null && { is_feeds_subscribed: account.is_feeds_subscribed }),
                    ...(account.is_feeds_active != null && { is_feeds_active: account.is_feeds_active }),
                    ...(account.balance != null && { balance: account.balance }),
                    ...(account.bank_balance != null && { bank_balance: account.bank_balance }),
                    ...(account.bcy_balance != null && { bcy_balance: account.bcy_balance }),
                    ...(account.bank_name != null && { bank_name: account.bank_name }),
                    ...(account.routing_number != null && { routing_number: account.routing_number }),
                    ...(account.is_primary_account != null && { is_primary_account: account.is_primary_account }),
                    ...(account.is_paypal_account != null && { is_paypal_account: account.is_paypal_account }),
                    ...(account.description != null && { description: account.description }),
                    ...(account.refresh_status_code != null && { refresh_status_code: account.refresh_status_code }),
                    ...(account.feeds_last_refresh_date != null && { feeds_last_refresh_date: account.feeds_last_refresh_date }),
                    ...(account.service_id != null && { service_id: account.service_id }),
                    ...(account.is_system_account != null && { is_system_account: account.is_system_account }),
                    ...(account.is_show_warning_for_feeds_refresh != null && { is_show_warning_for_feeds_refresh: account.is_show_warning_for_feeds_refresh })
                };
            });

            if (records.length > 0) {
                await nango.batchSave(records, 'BankAccount');
            }
        }

        await nango.trackDeletesEnd('BankAccount');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
