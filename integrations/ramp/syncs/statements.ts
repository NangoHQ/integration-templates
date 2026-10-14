import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const OVERLAP_DAYS = 7;
const PAGE_SIZE = 100;

const CurrencyAmountSchema = z.object({
    amount: z.number().describe('Amount expressed in the smallest denomination of the currency, e.g. cents for USD.'),
    currency_code: z.string().describe('ISO 4217 currency code of the amount, e.g. "USD".'),
    minor_unit_conversion_rate: z
        .number()
        .nullable()
        .describe('Divisor used to convert the minor-unit amount into a major-unit value, e.g. 100 for USD; null when not applicable.')
});

const StatementLineSchema = z.object({
    id: z.string().optional().describe('Unique identifier of the statement line item.'),
    type: z.string().optional().describe('Line item type, one of "CARD_TRANSACTION", "TRANSFER_PAYMENT", or "CASHBACK".'),
    created_at: z.string().describe('Time the underlying card transaction was created or swiped, in ISO 8601 format.'),
    cleared_at: z.string().nullable().optional().describe('Time the transaction cleared, in ISO 8601 format; null while the transaction has not yet cleared.')
});

const StatementBalanceSectionSchema = z.object({
    id: z.string().describe('Unique identifier of the balance section.'),
    entity_id: z.string().describe('Identifier of the business entity this balance section belongs to.'),
    opening_balance: CurrencyAmountSchema.describe('Account balance at the beginning of the statement period for this entity.'),
    ending_balance: CurrencyAmountSchema.describe('Account balance at the end of the statement period for this entity.'),
    charges: CurrencyAmountSchema.describe('Total charges incurred during the statement period for this entity.'),
    credits: CurrencyAmountSchema.describe('Total credits accumulated during the statement period for this entity.'),
    payments: CurrencyAmountSchema.describe('Total payments made during the statement period for this entity.')
});

const StatementSchema = z
    .object({
        id: z.string().describe('Unique identifier of the statement.'),
        start_date: z.string().describe('Start of the statement period, in ISO 8601 format.'),
        end_date: z.string().describe('End of the statement period, in ISO 8601 format; used as the incremental high-water mark.'),
        statement_url: z.string().optional().describe('Pre-signed URL to download the statement PDF, valid for one hour after generation.'),
        preceding_statement_id: z.string().optional().describe('Identifier of the previous statement in the sequence, when present.'),
        balance_sections: z.array(StatementBalanceSectionSchema).describe('Balance breakdown by business entity and currency.'),
        statement_lines: z.array(StatementLineSchema).describe('Card transactions, transfers, and cashbacks that make up the statement period.'),
        opening_balance: CurrencyAmountSchema.optional().describe('Deprecated top-level opening balance for the statement period.'),
        ending_balance: CurrencyAmountSchema.optional().describe('Deprecated top-level ending balance for the statement period.'),
        charges: CurrencyAmountSchema.optional().describe('Deprecated top-level total charges for the statement period.'),
        credits: CurrencyAmountSchema.optional().describe('Deprecated top-level total credits for the statement period.'),
        payments: CurrencyAmountSchema.optional().describe('Deprecated top-level total payments for the statement period.')
    })
    .describe('A Ramp card statement covering a statement period, including balances and line items.');

const CheckpointSchema = z.object({
    last_statement_end_date: z
        .string()
        .describe('Highest statement period end date (ISO 8601) observed in the previous run, used as the incremental high-water mark.')
});

const sync = createSync({
    description: 'Sync card statements, including statement periods, balances, and line items.',
    version: '1.0.0',
    frequency: 'every half day',
    autoStart: true,
    scopes: ['statements:read'],
    checkpoint: CheckpointSchema,
    models: {
        Statement: StatementSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();

        let fromDate: string | undefined;
        if (checkpoint?.last_statement_end_date) {
            const lastEnd = Date.parse(checkpoint.last_statement_end_date);
            if (!Number.isNaN(lastEnd)) {
                fromDate = new Date(lastEnd - OVERLAP_DAYS * 24 * 60 * 60 * 1000).toISOString();
            }
        }

        const proxyConfig: ProxyConfiguration = {
            // https://docs.ramp.com/openapi/developer-api.json -> GET /developer/v1/statements
            endpoint: '/developer/v1/statements',
            params: {
                ...(fromDate && { from_date: fromDate })
            },
            paginate: {
                type: 'link',
                link_path_in_response_body: 'page.next',
                response_path: 'data',
                limit_name_in_request: 'page_size',
                limit: PAGE_SIZE
            },
            retries: 3
        };

        let maxEndDate: string | undefined;

        for await (const records of nango.paginate<unknown>(proxyConfig)) {
            const statements = records.map((record) => StatementSchema.parse(record));

            if (statements.length === 0) {
                continue;
            }

            for (const statement of statements) {
                if (maxEndDate === undefined || Date.parse(statement.end_date) > Date.parse(maxEndDate)) {
                    maxEndDate = statement.end_date;
                }
            }

            await nango.batchSave(statements, 'Statement');
        }

        if (maxEndDate !== undefined) {
            await nango.saveCheckpoint({ last_statement_end_date: maxEndDate });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
