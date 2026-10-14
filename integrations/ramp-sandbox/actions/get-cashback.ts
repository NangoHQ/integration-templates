import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        cashback_id: z.string().describe('Unique identifier of the cashback to retrieve. Example: "46a6cac4-42d4-4011-adf2-8ff354650934"')
    })
    .describe('Identifies the cashback record to retrieve.');

const ProviderCurrencyAmountSchema = z.object({
    amount: z.number(),
    currency_code: z.string(),
    minor_unit_conversion_rate: z.number().nullable()
});

const ProviderCashbackSchema = z.object({
    id: z.string(),
    amount: ProviderCurrencyAmountSchema,
    entity_id: z.string().nullable().optional(),
    sync_status: z.string(),
    created_at: z.string().nullable().optional()
});

const OutputSchema = z
    .object({
        id: z.string().describe('Unique identifier of the cashback. Example: "46a6cac4-42d4-4011-adf2-8ff354650934"'),
        amount: z
            .object({
                amount: z.number().describe('Cashback amount in the smallest denomination of the currency (for USD, cents). Example: 77948 means $779.48'),
                currency_code: z.string().describe('ISO 4217 currency code of the cashback amount. Example: "USD"'),
                minor_unit_conversion_rate: z
                    .number()
                    .nullable()
                    .optional()
                    .describe('Divisor used to convert `amount` into the real currency value (for USD, 100). Null when no conversion rate applies')
            })
            .describe('Cashback amount, in minor units, with its currency.'),
        entity_id: z.string().optional().describe('Unique identifier of the business entity associated with the cashback'),
        sync_status: z.string().describe('Accounting sync status of the cashback: "NOT_SYNC_READY", "SYNCED", or "SYNC_READY"'),
        created_at: z.string().optional().describe('ISO 8601 timestamp when the cashback was created')
    })
    .describe('A single cashback record.');

/**
 * @tags: [read]
 * @tagReason: Reads a single cashback record from the provider; makes no provider changes.
 * @pitfalls: Amounts are in minor units (for USD, cents), so divide `amount.amount` by `amount.minor_unit_conversion_rate` to get the real value; a nonexistent cashback ID errors as not found rather than returning an empty record.
 */
const action = createAction({
    description: 'Retrieve a single cashback record by ID.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['cashbacks:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.ramp.com/developer-api/v1/api-reference/cashbacks/get-cashback
            endpoint: `/developer/v1/cashbacks/${encodeURIComponent(input.cashback_id)}`,
            retries: 3
        });

        const cashback = ProviderCashbackSchema.parse(response.data);

        return {
            id: cashback.id,
            amount: {
                amount: cashback.amount.amount,
                currency_code: cashback.amount.currency_code,
                ...(cashback.amount.minor_unit_conversion_rate != null && { minor_unit_conversion_rate: cashback.amount.minor_unit_conversion_rate })
            },
            ...(cashback.entity_id != null && { entity_id: cashback.entity_id }),
            sync_status: cashback.sync_status,
            ...(cashback.created_at != null && { created_at: cashback.created_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
