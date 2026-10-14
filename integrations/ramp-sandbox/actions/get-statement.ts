import { z } from 'zod';
import { createAction } from 'nango';

const CurrencyAmountSchema = z
    .object({
        amount: z
            .number()
            .describe('Monetary amount expressed in the smallest denomination of the currency; for USD this is cents (e.g. 12034 means $120.34).'),
        currency_code: z.string().describe('ISO 4217 currency code of the amount. Example: "USD"'),
        minor_unit_conversion_rate: z
            .number()
            .nullable()
            .describe(
                'Conversion factor between the integer amount and the true currency value; divide amount by this value to get the major-unit value. Null when the provider does not supply a rate.'
            )
    })
    .describe('A monetary value together with its currency and minor-unit conversion rate.');

const StatementBalanceSectionSchema = z
    .object({
        id: z.string().describe('Unique identifier of the balance section.'),
        entity_id: z.string().describe('Identifier of the business entity this balance section belongs to.'),
        opening_balance: CurrencyAmountSchema.describe('Balance at the beginning of the statement period for this entity.'),
        ending_balance: CurrencyAmountSchema.describe('Balance at the end of the statement period for this entity.'),
        charges: CurrencyAmountSchema.describe('Total charges incurred during the statement period for this entity.'),
        credits: CurrencyAmountSchema.describe('Total credits accumulated during the statement period for this entity.'),
        payments: CurrencyAmountSchema.describe('Total payments made during the statement period for this entity.')
    })
    .describe('Statement balance breakdown for a single business entity.');

const StatementLineSchema = z
    .object({
        id: z.string().optional().describe('Unique identifier of the statement line item.'),
        type: z.enum(['CARD_TRANSACTION', 'CASHBACK', 'TRANSFER_PAYMENT']).optional().describe('Type of the statement line item.'),
        created_at: z.string().describe('Time the line item was created; for card transactions this is when the card was swiped.'),
        cleared_at: z
            .string()
            .nullable()
            .optional()
            .describe('Time the transaction cleared. Only present for transactions and null when the transaction has not cleared.')
    })
    .describe('A single financial activity line on the statement, such as a card transaction, transfer payment, or cashback.');

const InputSchema = z
    .object({
        statement_id: z.string().describe('Unique identifier of the statement to retrieve. Example: "77b892f3-c92e-4841-9a13-18284f56020b"')
    })
    .describe('Input identifying the statement to retrieve.');

const OutputSchema = z
    .object({
        id: z.string().describe('Unique identifier of the statement.'),
        start_date: z.string().describe('Start date of the statement period in ISO 8601 format.'),
        end_date: z.string().describe('End date of the statement period in ISO 8601 format.'),
        opening_balance: CurrencyAmountSchema.describe('Balance at the beginning of the statement period.'),
        ending_balance: CurrencyAmountSchema.describe('Balance at the end of the statement period.'),
        charges: CurrencyAmountSchema.describe('Total charges incurred during the statement period.'),
        credits: CurrencyAmountSchema.describe('Total credits accumulated during the statement period.'),
        payments: CurrencyAmountSchema.describe('Total payments made during the statement period.'),
        balance_sections: z.array(StatementBalanceSectionSchema).describe('Per-entity breakdown of the statement balances.'),
        statement_lines: z
            .array(StatementLineSchema)
            .describe('Financial activities during the statement period, including card transactions, transfers, and cashbacks.'),
        preceding_statement_id: z.string().optional().describe('Identifier of the previous statement in sequence, when one exists.'),
        statement_url: z.string().optional().describe('Pre-signed URL to download the statement PDF; only present when generated and valid for about one hour.')
    })
    .describe('A single Ramp statement with its period, balances, balance sections, and statement line items.');

const ProviderCurrencyAmountSchema = z.object({
    amount: z.number(),
    currency_code: z.string(),
    minor_unit_conversion_rate: z.number().nullable().optional()
});

const ProviderStatementSchema = z.object({
    id: z.string(),
    start_date: z.string(),
    end_date: z.string(),
    opening_balance: ProviderCurrencyAmountSchema,
    ending_balance: ProviderCurrencyAmountSchema,
    charges: ProviderCurrencyAmountSchema,
    credits: ProviderCurrencyAmountSchema,
    payments: ProviderCurrencyAmountSchema,
    balance_sections: z.array(
        z.object({
            id: z.string(),
            entity_id: z.string(),
            opening_balance: ProviderCurrencyAmountSchema,
            ending_balance: ProviderCurrencyAmountSchema,
            charges: ProviderCurrencyAmountSchema,
            credits: ProviderCurrencyAmountSchema,
            payments: ProviderCurrencyAmountSchema
        })
    ),
    statement_lines: z.array(
        z.object({
            id: z.string().nullable().optional(),
            type: z.enum(['CARD_TRANSACTION', 'CASHBACK', 'TRANSFER_PAYMENT']).nullable().optional(),
            created_at: z.string(),
            cleared_at: z.string().nullable().optional()
        })
    ),
    preceding_statement_id: z.string().nullable().optional(),
    statement_url: z.string().nullable().optional()
});

function mapAmount(amount: z.infer<typeof ProviderCurrencyAmountSchema>): z.infer<typeof CurrencyAmountSchema> {
    return {
        amount: amount.amount,
        currency_code: amount.currency_code,
        minor_unit_conversion_rate: amount.minor_unit_conversion_rate ?? null
    };
}

/**
 * @tags: [read]
 * @tagReason: Retrieves an existing statement from the provider without modifying any data.
 * @pitfalls: All monetary amounts are in minor units (e.g. cents), so divide by minor_unit_conversion_rate for the real value; statement_url is a pre-signed download link that is often absent and expires about an hour after generation, and cleared_at is null for transactions that have not yet cleared.
 */
const action = createAction({
    description: 'Retrieve a single statement by ID.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['statements:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.ramp.com/developer-api/v1/api-reference/statements/get
            endpoint: `/developer/v1/statements/${encodeURIComponent(input.statement_id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Statement not found.',
                statement_id: input.statement_id
            });
        }

        const statement = ProviderStatementSchema.parse(response.data);

        return {
            id: statement.id,
            start_date: statement.start_date,
            end_date: statement.end_date,
            opening_balance: mapAmount(statement.opening_balance),
            ending_balance: mapAmount(statement.ending_balance),
            charges: mapAmount(statement.charges),
            credits: mapAmount(statement.credits),
            payments: mapAmount(statement.payments),
            balance_sections: statement.balance_sections.map((section) => ({
                id: section.id,
                entity_id: section.entity_id,
                opening_balance: mapAmount(section.opening_balance),
                ending_balance: mapAmount(section.ending_balance),
                charges: mapAmount(section.charges),
                credits: mapAmount(section.credits),
                payments: mapAmount(section.payments)
            })),
            statement_lines: statement.statement_lines.map((line) => ({
                ...(line.id != null && { id: line.id }),
                ...(line.type != null && { type: line.type }),
                created_at: line.created_at,
                ...(line.cleared_at !== undefined && { cleared_at: line.cleared_at })
            })),
            ...(statement.preceding_statement_id != null && { preceding_statement_id: statement.preceding_statement_id }),
            ...(statement.statement_url != null && { statement_url: statement.statement_url })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
