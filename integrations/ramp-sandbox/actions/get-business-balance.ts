import { z } from 'zod';
import { createAction } from 'nango';

const CurrencyAmountSchema = z.object({
    amount: z.number().describe('Monetary amount in the smallest currency unit (e.g. cents for USD). Example: 29763957'),
    currency_code: z.string().describe('ISO 4217 currency code of the amount. Example: "USD"'),
    minor_unit_conversion_rate: z
        .number()
        .optional()
        .describe(
            'Divisor that converts `amount` to the real currency value (e.g. 100 for USD, so 29763957 / 100 = 297639.57). Absent when Ramp does not provide one.'
        )
});

const ProviderCurrencyAmountSchema = z.object({
    amount: z.number(),
    currency_code: z.string(),
    minor_unit_conversion_rate: z.number().nullable()
});

const ProviderBalanceSchema = z.object({
    card_balance_including_pending_amount: ProviderCurrencyAmountSchema,
    card_balance_excluding_pending_amount: ProviderCurrencyAmountSchema,
    statement_balance_amount: ProviderCurrencyAmountSchema,
    balance_including_pending_amount: ProviderCurrencyAmountSchema,
    card_limit_amount: ProviderCurrencyAmountSchema,
    available_card_limit_amount: ProviderCurrencyAmountSchema,
    global_limit_amount: ProviderCurrencyAmountSchema,
    max_balance_amount: ProviderCurrencyAmountSchema,
    flex_limit_amount: ProviderCurrencyAmountSchema,
    flex_balance_amount: ProviderCurrencyAmountSchema,
    available_flex_limit_amount: ProviderCurrencyAmountSchema,
    float_balance_excluding_pending_amount: ProviderCurrencyAmountSchema,
    prev_billing_date: z.string().optional(),
    next_billing_date: z.string().optional()
});

function mapAmount(amount: z.infer<typeof ProviderCurrencyAmountSchema>): z.infer<typeof CurrencyAmountSchema> {
    return {
        amount: amount.amount,
        currency_code: amount.currency_code,
        ...(amount.minor_unit_conversion_rate != null && { minor_unit_conversion_rate: amount.minor_unit_conversion_rate })
    };
}

const OutputSchema = z
    .object({
        card_balance_including_pending_amount: CurrencyAmountSchema.describe('Aggregate card balance including pending transactions.'),
        card_balance_excluding_pending_amount: CurrencyAmountSchema.describe('Aggregate card balance excluding pending transactions.'),
        statement_balance_amount: CurrencyAmountSchema.describe('Balance from the most recent card statement.'),
        balance_including_pending_amount: CurrencyAmountSchema.describe('Total balance including pending transactions.'),
        card_limit_amount: CurrencyAmountSchema.describe('Maximum allowed card spending limit.'),
        available_card_limit_amount: CurrencyAmountSchema.describe('Remaining available card spending limit.'),
        global_limit_amount: CurrencyAmountSchema.describe('Overall spending limit for the business.'),
        max_balance_amount: CurrencyAmountSchema.describe('Maximum balance allowed for the business.'),
        flex_limit_amount: CurrencyAmountSchema.describe('Maximum allowed flex spending limit.'),
        flex_balance_amount: CurrencyAmountSchema.describe('Current flex spending balance.'),
        available_flex_limit_amount: CurrencyAmountSchema.describe('Remaining available flex spending limit.'),
        float_balance_excluding_pending_amount: CurrencyAmountSchema.describe('Float account balance excluding pending transactions.'),
        prev_billing_date: z.string().optional().describe('Date of the previous billing cycle, formatted as MM/DD/YYYY. Example: "10/14/2026"'),
        next_billing_date: z.string().optional().describe('Date of the next billing cycle, formatted as MM/DD/YYYY. Example: "11/14/2026"')
    })
    .describe('Aggregate card balance, spending limits, and billing cycle dates for the business.');

/**
 * @tags: [read]
 * @tagReason: Reads the business's aggregate balance and limit information without mutating any provider state.
 */
const action = createAction({
    description: 'Get the business aggregate card balance, limits, and billing cycle dates.',
    version: '1.0.0',
    scopes: ['business:read'],
    input: z.void(),
    output: OutputSchema,

    exec: async (nango): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.ramp.com/developer-api/v1/api-reference/business/get-business-balance
            endpoint: '/developer/v1/business/balance',
            retries: 3
        });

        const balance = ProviderBalanceSchema.parse(response.data);

        return {
            card_balance_including_pending_amount: mapAmount(balance.card_balance_including_pending_amount),
            card_balance_excluding_pending_amount: mapAmount(balance.card_balance_excluding_pending_amount),
            statement_balance_amount: mapAmount(balance.statement_balance_amount),
            balance_including_pending_amount: mapAmount(balance.balance_including_pending_amount),
            card_limit_amount: mapAmount(balance.card_limit_amount),
            available_card_limit_amount: mapAmount(balance.available_card_limit_amount),
            global_limit_amount: mapAmount(balance.global_limit_amount),
            max_balance_amount: mapAmount(balance.max_balance_amount),
            flex_limit_amount: mapAmount(balance.flex_limit_amount),
            flex_balance_amount: mapAmount(balance.flex_balance_amount),
            available_flex_limit_amount: mapAmount(balance.available_flex_limit_amount),
            float_balance_excluding_pending_amount: mapAmount(balance.float_balance_excluding_pending_amount),
            ...(balance.prev_billing_date != null && { prev_billing_date: balance.prev_billing_date }),
            ...(balance.next_billing_date != null && { next_billing_date: balance.next_billing_date })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
