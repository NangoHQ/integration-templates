import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const TreasuryAccountSchema = z.object({
    id: z.string(),
    name: z.string(),
    account_type: z.string()
});

const CurrencyAmountSchema = z.object({
    amount: z.number(),
    currency_code: z.string(),
    minor_unit_conversion_rate: z.number().nullable().optional()
});

const BalanceHistoryItemSchema = z.object({
    amount: CurrencyAmountSchema,
    date: z.string()
});

const AccountLastDatesSchema = z.record(z.string(), z.string());

const BankingAccountBalanceSchema = z
    .object({
        id: z.string().describe('Stable unique identifier for the balance snapshot, composed of the account ID and the balance date (`{account_id}:{date}`).'),
        account_id: z.string().describe('Unique identifier of the Ramp Treasury/Business account this balance snapshot belongs to.'),
        account_name: z.string().describe('Display name of the Ramp Treasury/Business account.'),
        date: z.string().describe('Calendar date of the balance snapshot in `YYYY-MM-DD` format.'),
        amount: z.number().describe('Available balance on this date in the smallest currency unit (for USD, cents).'),
        currency_code: z.string().describe('ISO 4217 currency code of the balance, e.g. `USD`.')
    })
    .describe('Daily available balance snapshot for a single Ramp Treasury/Business account.');

const CheckpointSchema = z.object({
    account_last_dates: z.string()
});

function parseAccountLastDates(raw: string | undefined): Record<string, string> {
    if (!raw) {
        return {};
    }

    let decoded: unknown;
    // @allowTryCatch - A corrupt or partially written checkpoint string should degrade to a full re-fetch instead of crashing the sync.
    try {
        decoded = JSON.parse(raw);
    } catch {
        return {};
    }

    const result = AccountLastDatesSchema.safeParse(decoded);
    return result.success ? result.data : {};
}

const sync = createSync({
    description: 'Sync the daily available balance history for every Ramp Treasury/Business account.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        BankingAccountBalance: BankingAccountBalanceSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const accountLastDates = parseAccountLastDates(checkpoint?.account_last_dates);

        const accountsConfig: ProxyConfiguration = {
            // https://docs.ramp.com/developer-api/v1/api-reference/banking/list-banking-accounts
            endpoint: '/developer/v1/banking/accounts',
            paginate: {
                type: 'link',
                link_path_in_response_body: 'page.next',
                response_path: 'data',
                limit_name_in_request: 'page_size',
                limit: 100
            },
            retries: 3
        };

        const accounts: z.infer<typeof TreasuryAccountSchema>[] = [];
        for await (const page of nango.paginate<unknown>(accountsConfig)) {
            for (const item of page) {
                accounts.push(TreasuryAccountSchema.parse(item));
            }
        }

        const updatedLastDates: Record<string, string> = { ...accountLastDates };

        for (const account of accounts) {
            const startDate = accountLastDates[account.id];

            const balanceHistoryConfig: ProxyConfiguration = {
                // https://docs.ramp.com/developer-api/v1/api-reference/banking/get-balance-history
                endpoint: `/developer/v1/banking/accounts/${encodeURIComponent(account.id)}/balance-history`,
                params: {
                    ...(startDate !== undefined ? { start_date: startDate } : {})
                },
                paginate: {
                    type: 'link',
                    link_path_in_response_body: 'page.next',
                    response_path: 'data',
                    limit_name_in_request: 'page_size',
                    limit: 100
                },
                retries: 3
            };

            const balances: z.infer<typeof BankingAccountBalanceSchema>[] = [];
            let maxDate = startDate;

            for await (const page of nango.paginate<unknown>(balanceHistoryConfig)) {
                for (const item of page) {
                    const balance = BalanceHistoryItemSchema.parse(item);
                    balances.push({
                        id: `${account.id}:${balance.date}`,
                        account_id: account.id,
                        account_name: account.name,
                        date: balance.date,
                        amount: balance.amount.amount,
                        currency_code: balance.amount.currency_code
                    });

                    if (maxDate === undefined || balance.date > maxDate) {
                        maxDate = balance.date;
                    }
                }
            }

            if (balances.length > 0) {
                await nango.batchSave(balances, 'BankingAccountBalance');
            }

            if (maxDate !== undefined) {
                updatedLastDates[account.id] = maxDate;
            }

            await nango.saveCheckpoint({ account_last_dates: JSON.stringify(updatedLastDates) });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
