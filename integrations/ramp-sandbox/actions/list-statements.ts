import { z } from 'zod';
import { createAction } from 'nango';

const CurrencyAmountSchema = z.object({
    amount: z.number().int().describe('Amount in the smallest currency unit (e.g. cents for USD).'),
    currency_code: z.string().describe('ISO 4217 currency code. Example: "USD".'),
    minor_unit_conversion_rate: z.number().int().nullable().describe('Divisor used to convert amount into the real currency value (100 for USD).')
});

const StatementLineSchema = z.object({
    id: z.string().optional().describe('Unique identifier of the statement line item.'),
    type: z.string().optional().describe('Line item type: CARD_TRANSACTION, TRANSFER_PAYMENT, or CASHBACK.'),
    cleared_at: z.string().nullable().optional().describe('Time the transaction cleared; null when it has not cleared yet.'),
    created_at: z.string().describe('Time the line was created (card swipe time for transactions).')
});

const BalanceSectionSchema = z.object({
    id: z.string().describe('Unique identifier of the balance section.'),
    entity_id: z.string().describe('Business entity the balance section belongs to.'),
    charges: CurrencyAmountSchema.describe('Total charges during the statement period.'),
    credits: CurrencyAmountSchema.describe('Total credits during the statement period.'),
    opening_balance: CurrencyAmountSchema.describe('Balance at the start of the statement period.'),
    ending_balance: CurrencyAmountSchema.describe('Balance at the end of the statement period.'),
    payments: CurrencyAmountSchema.describe('Total payments made during the statement period.')
});

const StatementSchema = z.object({
    id: z.string().describe('Unique identifier of the statement.'),
    start_date: z.string().describe('Start of the statement period (ISO-8601).'),
    end_date: z.string().describe('End of the statement period (ISO-8601).'),
    preceding_statement_id: z.string().nullable().optional().describe('Identifier of the previous statement in sequence, when present.'),
    statement_url: z.string().nullable().optional().describe('Pre-signed URL to download the statement PDF; expires one hour after generation.'),
    charges: CurrencyAmountSchema.describe('Total charges during the statement period.'),
    credits: CurrencyAmountSchema.describe('Total credits during the statement period.'),
    opening_balance: CurrencyAmountSchema.describe('Balance at the start of the statement period.'),
    ending_balance: CurrencyAmountSchema.describe('Balance at the end of the statement period.'),
    payments: CurrencyAmountSchema.describe('Total payments made during the statement period.'),
    balance_sections: z.array(BalanceSectionSchema).describe('Per-entity and per-currency balance breakdowns for the statement.'),
    statement_lines: z
        .array(StatementLineSchema)
        .describe('Financial activities (card transactions, transfers, cashbacks) cleared during the statement period.')
});

const InputSchema = z
    .object({
        from_date: z
            .string()
            .optional()
            .describe('Only return statements whose period ends on or after this ISO-8601 datetime. Example: "2026-01-01T00:00:00Z".'),
        to_date: z
            .string()
            .optional()
            .describe('Only return statements whose period ends on or before this ISO-8601 datetime. Example: "2026-12-31T23:59:59Z".'),
        page_size: z.number().int().min(2).max(100).optional().describe('Number of statements per page (2-100). Defaults to 20.'),
        cursor: z.uuid().optional().describe('Pagination cursor: the id of the last statement from the previous page. Omit to fetch the first page.')
    })
    .describe('Filters and pagination for listing card statements.');

const ProviderResponseSchema = z.object({
    data: z.array(StatementSchema),
    page: z
        .object({
            next: z.string().nullable()
        })
        .optional()
});

const OutputSchema = z
    .object({
        statements: z.array(StatementSchema).describe('Card statements matching the filters.'),
        next_cursor: z.string().optional().describe('Cursor to pass back as `cursor` to fetch the next page; absent when there are no more pages.')
    })
    .describe('Card statements matching the filters, plus a cursor for the next page when more exist.');

/**
 * @tags: [read]
 * @tagReason: Reads card statements from the provider and does not modify any provider state.
 * @pitfalls: from_date and to_date require a full ISO-8601 datetime (a bare date is rejected); statement_url is null when no statement PDF is available.
 */
const action = createAction({
    description: 'List card statements.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.ramp.com/developer-api/v1/overview/introduction
        const response = await nango.get({
            endpoint: '/developer/v1/statements',
            params: {
                ...(input.from_date !== undefined && { from_date: input.from_date }),
                ...(input.to_date !== undefined && { to_date: input.to_date }),
                ...(input.page_size !== undefined && { page_size: input.page_size }),
                ...(input.cursor !== undefined && { start: input.cursor })
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);
        const lastStatement = parsed.data.length > 0 ? parsed.data[parsed.data.length - 1] : undefined;
        const hasMore = parsed.page?.next != null;

        return {
            statements: parsed.data,
            ...(hasMore && lastStatement ? { next_cursor: lastStatement.id } : {})
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
