import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const SyncStatusSchema = z.enum(['NOT_SYNC_READY', 'SYNCED', 'SYNC_READY']);

const CashbackAmountSchema = z
    .object({
        amount: z.number().int().describe('Cashback amount in the currency\u2019s smallest unit, e.g. cents for USD. Example: 1500'),
        currency_code: z.string().describe('ISO 4217 currency code of the cashback amount. Example: "USD"'),
        minor_unit_conversion_rate: z
            .number()
            .int()
            .nullable()
            .describe('Divisor that converts amount to the real currency value (e.g. 100 for USD); null when the rate is unknown.')
    })
    .describe('Monetary amount of the cashback.');

const CashbackSchema = z
    .object({
        id: z.string().optional().describe('Unique identifier of the cashback.'),
        entity_id: z.string().optional().describe('ID of the business entity the cashback belongs to.'),
        amount: CashbackAmountSchema,
        created_at: z.string().optional().describe('ISO 8601 timestamp when the cashback was created.'),
        sync_status: SyncStatusSchema.describe('Accounting sync status of the cashback.')
    })
    .describe('A cashback payout earned on card spend.');

const InputSchema = z
    .object({
        cursor: z
            .string()
            .min(1)
            .optional()
            .describe('Opaque pagination cursor taken from a previous response\u2019s next_cursor. Omit to fetch the first page.'),
        page_size: z.number().int().min(2).max(100).optional().describe('Number of cashbacks per page (between 2 and 100). Defaults to 20 when omitted.'),
        sync_status: SyncStatusSchema.optional().describe('Only return cashbacks with this accounting sync status.'),
        entity_id: z.string().optional().describe('Only return cashbacks belonging to this business entity ID.'),
        statement_id: z.string().optional().describe('Only return cashbacks included in this statement ID.'),
        sync_ready: z
            .boolean()
            .optional()
            .describe('When true, only return cashbacks ready to sync (no pending syncs and completed). Ignored when sync_status is provided.'),
        from_date: z.string().optional().describe('Only return cashbacks created on or after this ISO 8601 datetime. Example: "2026-01-01T00:00:00Z"'),
        to_date: z.string().optional().describe('Only return cashbacks created on or before this ISO 8601 datetime. Example: "2026-12-31T23:59:59Z"')
    })
    .describe('Filters and pagination options for listing cashback payouts.');

const OutputSchema = z
    .object({
        cashbacks: z.array(CashbackSchema).describe('Cashback payouts returned for the requested page.'),
        next_cursor: z.string().optional().describe('Cursor to pass as cursor to fetch the next page. Omitted when there are no further pages.')
    })
    .describe('A single page of cashback payouts.');

const ProviderCashbackAmountSchema = z.object({
    amount: z.number().int(),
    currency_code: z.string(),
    minor_unit_conversion_rate: z.number().int().nullable()
});

const ProviderCashbackSchema = z.object({
    id: z.string().optional(),
    entity_id: z.string().optional(),
    amount: ProviderCashbackAmountSchema,
    created_at: z.string().optional(),
    sync_status: SyncStatusSchema
});

const ProviderCashbackListSchema = z.object({
    data: z.array(ProviderCashbackSchema),
    page: z.object({
        next: z.string().nullable()
    })
});

function getNextCursor(next: string | null): string | undefined {
    if (next === null || next.length === 0) {
        return undefined;
    }
    const queryIndex = next.indexOf('?');
    if (queryIndex === -1) {
        return undefined;
    }
    for (const pair of next.slice(queryIndex + 1).split('&')) {
        const separatorIndex = pair.indexOf('=');
        if (separatorIndex === -1) {
            continue;
        }
        const key = pair.slice(0, separatorIndex);
        const value = pair.slice(separatorIndex + 1);
        if (key === 'start' && value.length > 0) {
            return decodeURIComponent(value);
        }
    }
    return undefined;
}

/**
 * @tags: [read]
 * @tagReason: Reads cashback payouts from the provider without creating, updating, or deleting any data.
 * @pitfalls: Amounts are integers in the currency's smallest unit and must be divided by minor_unit_conversion_rate for the real value; sync_status supersedes sync_ready when both are supplied; each call returns only one page, so refetch with next_cursor (and the same filters) to get the remaining results.
 */
const action = createAction({
    description: 'List cashback payouts earned on card spend.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['cashbacks:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number | string[] | number[]> = {};
        if (input.cursor !== undefined) {
            params['start'] = input.cursor;
        }
        if (input.page_size !== undefined) {
            params['page_size'] = input.page_size;
        }
        if (input.sync_status !== undefined) {
            params['sync_status'] = input.sync_status;
        }
        if (input.entity_id !== undefined) {
            params['entity_id'] = input.entity_id;
        }
        if (input.statement_id !== undefined) {
            params['statement_id'] = input.statement_id;
        }
        if (input.sync_ready !== undefined) {
            params['sync_ready'] = String(input.sync_ready);
        }
        if (input.from_date !== undefined) {
            params['from_date'] = input.from_date;
        }
        if (input.to_date !== undefined) {
            params['to_date'] = input.to_date;
        }

        const config: ProxyConfiguration = {
            // https://docs.ramp.com/developer-api/v1/api/cashbacks
            endpoint: '/developer/v1/cashbacks',
            params,
            retries: 3
        };

        const response = await nango.get(config);
        const parsed = ProviderCashbackListSchema.parse(response.data);

        const cashbacks = parsed.data.map((cashback) => ({
            ...(cashback.id !== undefined && { id: cashback.id }),
            ...(cashback.entity_id !== undefined && { entity_id: cashback.entity_id }),
            amount: {
                amount: cashback.amount.amount,
                currency_code: cashback.amount.currency_code,
                minor_unit_conversion_rate: cashback.amount.minor_unit_conversion_rate
            },
            ...(cashback.created_at !== undefined && { created_at: cashback.created_at }),
            sync_status: cashback.sync_status
        }));

        const nextCursor = getNextCursor(parsed.page.next);

        return {
            cashbacks,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
