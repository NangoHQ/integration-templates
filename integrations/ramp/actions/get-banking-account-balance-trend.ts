import { z } from 'zod';
import { createAction } from 'nango';

const ProviderTreasuryAccountSchema = z.object({
    id: z.string(),
    name: z.string(),
    account_type: z.string()
});

const ProviderBalanceHistoryItemSchema = z.object({
    date: z.string(),
    amount: z.object({
        amount: z.number(),
        currency_code: z.string(),
        minor_unit_conversion_rate: z.number().nullable()
    })
});

const InputSchema = z
    .object({
        account_id: z
            .string()
            .optional()
            .describe(
                'ID of the Ramp banking (Treasury) account to report on. Omit it to list the available banking accounts instead of returning balance history.'
            ),
        start_date: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .optional()
            .describe('Only include balance snapshots on or after this date, as a plain calendar date in YYYY-MM-DD format (not a full ISO timestamp).'),
        end_date: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .optional()
            .describe('Only include balance snapshots on or before this date, as a plain calendar date in YYYY-MM-DD format (not a full ISO timestamp).')
    })
    .describe('Input for resolving a Ramp banking (Treasury) account and its daily balance history.');

const AccountOutputSchema = z.object({
    id: z.string().describe('Unique identifier of the Ramp banking account.'),
    name: z.string().describe('Display name of the Ramp banking account.'),
    account_type: z
        .string()
        .describe('Type of financial account: WALLET_ACCOUNT (checking), BROKERAGE_ACCOUNT (self-directed), or MANAGED_PORTFOLIO_ACCOUNT (managed portfolio).')
});

const BalanceHistoryEntrySchema = z.object({
    date: z.string().describe('Date of the balance snapshot, in YYYY-MM-DD format.'),
    amount: z.number().describe('Available balance on this date, in the smallest currency denomination (e.g. cents for USD).'),
    currency_code: z.string().describe('ISO 4217 currency code of the balance, e.g. USD.'),
    minor_unit_conversion_rate: z
        .number()
        .optional()
        .describe('Divide amount by this value to get the real currency value (100 for USD). Absent when the provider does not report it.')
});

const TrendSummarySchema = z.object({
    start_balance: z
        .number()
        .nullable()
        .describe('Balance on the earliest date in the returned range, in minor units. Null when the range contains no balance data.'),
    end_balance: z
        .number()
        .nullable()
        .describe('Balance on the latest date in the returned range, in minor units. Null when the range contains no balance data.'),
    change: z
        .number()
        .nullable()
        .describe('end_balance minus start_balance, in minor units (positive means the balance grew). Null when the range contains no balance data.'),
    currency_code: z.string().nullable().describe('ISO 4217 currency code of the balances, e.g. USD. Null when the range contains no balance data.'),
    message: z.string().describe('Human-readable note describing the trend, or stating that no balance data exists in the requested range.')
});

const OutputSchema = z
    .object({
        account: AccountOutputSchema.optional().describe('The resolved banking account; present when account_id was provided.'),
        accounts: z
            .array(AccountOutputSchema)
            .optional()
            .describe('The available banking accounts; present when account_id was omitted so the caller can choose one.'),
        balance_history: z.array(BalanceHistoryEntrySchema).describe('Daily balance snapshots for the account in the requested range, sorted oldest first.'),
        trend_summary: TrendSummarySchema.optional().describe('Computed balance trend across the returned range; present when account_id was provided.')
    })
    .describe('A Ramp banking account merged with its daily balance history and a computed balance trend.');

/**
 * @tags: [read]
 * @tagReason: Lists Ramp banking accounts and reads their daily balance history; it never mutates provider data.
 * @pitfalls: Banking is US-only; omitting account_id returns only the candidate accounts (the output switches from account to accounts) with no balance data; and a date range with no snapshots yields an empty balance_history and null trend values rather than an error.
 */
const action = createAction({
    description: 'Get a Ramp Treasury/Business banking account merged with its daily balance history and a computed balance trend.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['treasury:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const accounts: z.infer<typeof ProviderTreasuryAccountSchema>[] = [];

        // https://docs.ramp.com/developer-api/v1/banking
        for await (const page of nango.paginate<unknown>({
            endpoint: '/developer/v1/banking/accounts',
            paginate: {
                type: 'link',
                link_path_in_response_body: 'page.next',
                response_path: 'data',
                limit: 100,
                limit_name_in_request: 'page_size'
            },
            retries: 3
        })) {
            for (const raw of page) {
                accounts.push(ProviderTreasuryAccountSchema.parse(raw));
            }
        }

        if (input.account_id === undefined) {
            return {
                accounts: accounts.map((account) => ({
                    id: account.id,
                    name: account.name,
                    account_type: account.account_type
                })),
                balance_history: [],
                trend_summary: {
                    start_balance: null,
                    end_balance: null,
                    change: null,
                    currency_code: null,
                    message: 'No account_id was provided; returning the available banking accounts to choose from.'
                }
            };
        }

        const account = accounts.find((candidate) => candidate.id === input.account_id);
        if (account === undefined) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `No Ramp banking account found with id ${input.account_id}.`,
                account_id: input.account_id
            });
        }

        const params: Record<string, string | number> = { page_size: 100 };
        if (input.start_date !== undefined) {
            params['start_date'] = input.start_date;
        }
        if (input.end_date !== undefined) {
            params['end_date'] = input.end_date;
        }

        const balanceHistory: z.infer<typeof BalanceHistoryEntrySchema>[] = [];

        // https://docs.ramp.com/developer-api/v1/banking
        for await (const page of nango.paginate<unknown>({
            endpoint: `/developer/v1/banking/accounts/${encodeURIComponent(account.id)}/balance-history`,
            params,
            paginate: {
                type: 'link',
                link_path_in_response_body: 'page.next',
                response_path: 'data',
                limit: 100,
                limit_name_in_request: 'page_size'
            },
            retries: 3
        })) {
            for (const raw of page) {
                const entry = ProviderBalanceHistoryItemSchema.parse(raw);
                balanceHistory.push({
                    date: entry.date,
                    amount: entry.amount.amount,
                    currency_code: entry.amount.currency_code,
                    ...(entry.amount.minor_unit_conversion_rate != null && { minor_unit_conversion_rate: entry.amount.minor_unit_conversion_rate })
                });
            }
        }

        balanceHistory.sort((a, b) => a.date.localeCompare(b.date));

        const first = balanceHistory[0];
        const last = balanceHistory[balanceHistory.length - 1];

        let trendSummary: z.infer<typeof TrendSummarySchema>;
        if (first === undefined || last === undefined) {
            trendSummary = {
                start_balance: null,
                end_balance: null,
                change: null,
                currency_code: null,
                message: 'No balance data in the requested range.'
            };
        } else {
            trendSummary = {
                start_balance: first.amount,
                end_balance: last.amount,
                change: last.amount - first.amount,
                currency_code: last.currency_code,
                message: `Balance trend across ${balanceHistory.length} snapshot(s) from ${first.date} to ${last.date}.`
            };
        }

        return {
            account: {
                id: account.id,
                name: account.name,
                account_type: account.account_type
            },
            balance_history: balanceHistory,
            trend_summary: trendSummary
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
