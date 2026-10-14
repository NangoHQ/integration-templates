import { z } from 'zod';
import { createAction } from 'nango';

const CurrencyAmountSchema = z.object({
    amount: z.number().describe('Monetary amount in the smallest currency unit (e.g. cents for USD). Example: 29763957'),
    currency_code: z.string().describe('ISO 4217 currency code of the amount. Example: "USD"'),
    minor_unit_conversion_rate: z
        .number()
        .nullable()
        .describe('Divisor that converts `amount` to the real currency value (e.g. 100 for USD, so 29763957 / 100 = 297639.57). Can be null.')
});

const ProviderBalanceSchema = z.object({
    card_balance_including_pending_amount: CurrencyAmountSchema,
    card_balance_excluding_pending_amount: CurrencyAmountSchema,
    statement_balance_amount: CurrencyAmountSchema,
    balance_including_pending_amount: CurrencyAmountSchema,
    card_limit_amount: CurrencyAmountSchema,
    available_card_limit_amount: CurrencyAmountSchema,
    global_limit_amount: CurrencyAmountSchema,
    max_balance_amount: CurrencyAmountSchema,
    flex_limit_amount: CurrencyAmountSchema,
    flex_balance_amount: CurrencyAmountSchema,
    available_flex_limit_amount: CurrencyAmountSchema,
    float_balance_excluding_pending_amount: CurrencyAmountSchema,
    prev_billing_date: z.string().optional(),
    next_billing_date: z.string().optional()
});

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

        return ProviderBalanceSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
