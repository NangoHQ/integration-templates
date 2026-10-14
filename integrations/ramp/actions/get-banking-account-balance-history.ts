import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        account_id: z.string().describe('The Ramp banking (Treasury/Business) account ID. Example: "65c9931a-88c3-4e32-8abf-b707d3f74716"'),
        start_date: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .optional()
            .describe('Earliest balance date to include, as a plain YYYY-MM-DD date (not a full datetime). Example: "2026-10-01"'),
        end_date: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .optional()
            .describe('Latest balance date to include, as a plain YYYY-MM-DD date (not a full datetime). Example: "2026-10-14"'),
        cursor: z
            .string()
            .min(1)
            .optional()
            .describe('Opaque pagination cursor returned as next_cursor by a previous call (currently a YYYY-MM-DD date). Omit for the first page.'),
        page_size: z.number().int().min(2).max(100).optional().describe('Number of balance entries to return per page, between 2 and 100. Defaults to 20.')
    })
    .describe('Input for retrieving the daily available balance history of a Ramp Treasury/Business banking account.');

const ProviderAmountSchema = z.object({
    amount: z.number(),
    currency_code: z.string(),
    minor_unit_conversion_rate: z.number().nullable()
});

const ProviderBalanceSchema = z.object({
    date: z.string(),
    amount: ProviderAmountSchema
});

const ProviderResponseSchema = z.object({
    data: z.array(ProviderBalanceSchema),
    page: z.object({
        next: z.string().nullable()
    })
});

const OutputSchema = z
    .object({
        balances: z
            .array(
                z.object({
                    date: z.string().describe('Calendar date of the balance snapshot in YYYY-MM-DD format. Example: "2026-10-14"'),
                    amount: z
                        .object({
                            amount: z
                                .number()
                                .describe(
                                    'Available balance in the smallest currency unit (e.g. cents). Divide by minor_unit_conversion_rate for the decimal amount.'
                                ),
                            currency_code: z.string().describe('ISO 4217 currency code of the balance. Example: "USD"'),
                            minor_unit_conversion_rate: z
                                .number()
                                .optional()
                                .describe(
                                    'Factor that converts the minor-unit amount to the decimal amount (100 for USD). Absent when the provider does not supply it.'
                                )
                        })
                        .describe('Available balance for the account on this date.')
                })
            )
            .describe('Daily balance snapshots for the account, in ascending date order.'),
        next_cursor: z
            .string()
            .optional()
            .describe('Cursor (a YYYY-MM-DD date) to pass as `cursor` to fetch the next page. Absent when there are no more pages.')
    })
    .describe('Daily available balance snapshots for a Ramp Treasury/Business banking account, with an optional cursor for the next page.');

function extractStartCursor(nextUrl: string): string | undefined {
    const match = /[?&]start=([^&]+)/.exec(nextUrl);
    return match && match[1] !== undefined ? decodeURIComponent(match[1]) : undefined;
}

/**
 * @tags: [read]
 * @tagReason: Reads daily balance snapshots from the provider and does not modify any provider state.
 * @pitfalls: start_date and end_date must be plain YYYY-MM-DD dates, since full datetimes are rejected; balance amounts are returned in minor units (e.g. cents) and must be divided by minor_unit_conversion_rate to get the decimal amount; account_id must reference a Treasury/banking account, not an externally linked bank account.
 */
const action = createAction({
    description: 'Get the daily available balance history for a Ramp Treasury/Business banking account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['treasury:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://docs.ramp.com/openapi/developer-api.json - GET /developer/v1/banking/accounts/{account_id}/balance-history
            endpoint: `/developer/v1/banking/accounts/${encodeURIComponent(input.account_id)}/balance-history`,
            params: {
                ...(input.start_date !== undefined && { start_date: input.start_date }),
                ...(input.end_date !== undefined && { end_date: input.end_date }),
                ...(input.cursor !== undefined && { start: input.cursor }),
                ...(input.page_size !== undefined && { page_size: input.page_size })
            },
            retries: 3
        };

        const response = await nango.get(config);
        const providerResponse = ProviderResponseSchema.parse(response.data);

        const nextCursor = providerResponse.page.next !== null ? extractStartCursor(providerResponse.page.next) : undefined;

        return {
            balances: providerResponse.data.map((entry) => ({
                date: entry.date,
                amount: {
                    amount: entry.amount.amount,
                    currency_code: entry.amount.currency_code,
                    ...(entry.amount.minor_unit_conversion_rate != null && { minor_unit_conversion_rate: entry.amount.minor_unit_conversion_rate })
                }
            })),
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
