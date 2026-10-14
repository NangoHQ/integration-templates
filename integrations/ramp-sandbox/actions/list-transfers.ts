import { z } from 'zod';
import { createAction } from 'nango';

const TransferStatusSchema = z.enum([
    'ACH_CONFIRMED',
    'CANCELED',
    'COMPLETED',
    'ERROR',
    'INITIATED',
    'NOT_ACKED',
    'NOT_ENOUGH_FUNDS',
    'PROCESSING_BY_ODFI',
    'REJECTED_BY_ODFI',
    'RETURNED_BY_RDFI',
    'SUBMITTED_TO_FED',
    'SUBMITTED_TO_RDFI',
    'UNNECESSARY',
    'UPLOADED'
]);

const InputSchema = z
    .object({
        cursor: z.string().min(1).optional().describe('Pagination cursor: the ID of the last transfer from the previous page. Omit to fetch the first page.'),
        from_date: z.string().optional().describe('Only return transfers created on or after this ISO-8601 datetime. Example: "2026-10-01T00:00:00Z".'),
        to_date: z.string().optional().describe('Only return transfers created on or before this ISO-8601 datetime. Example: "2026-10-31T23:59:59Z".'),
        status: TransferStatusSchema.optional().describe('Only return transfers with this status.'),
        entity_id: z.string().optional().describe('Only return transfers belonging to this business entity.'),
        statement_id: z.string().optional().describe('Only return transfers included in this statement.'),
        page_size: z.number().int().min(2).max(100).optional().describe('Number of transfers to return per page, between 2 and 100. Defaults to 20.')
    })
    .describe('Filters and pagination for listing transfers.');

const CurrencyAmountSchema = z.object({
    amount: z.number().describe('Amount in the smallest currency unit (for USD, cents). Example: 136620 means 1366.20 USD.'),
    currency_code: z.string().describe('ISO 4217 currency code. Example: "USD".'),
    minor_unit_conversion_rate: z
        .number()
        .nullable()
        .optional()
        .describe('Divisor that converts the integer amount to the real currency value. For USD this is 100.')
});

const TransferSchema = z.object({
    id: z.string().describe('Unique identifier of the transfer.'),
    status: z.string().optional().describe('Current status of the transfer. Example: "COMPLETED".'),
    amount: CurrencyAmountSchema.optional().describe('Amount of the transfer.'),
    bank_account_id: z.string().optional().describe('ID of the bank account used for this transfer.'),
    payment_id: z.string().optional().describe('Payment identifier for the transfer.'),
    created_at: z.string().optional().describe('ISO-8601 timestamp when the transfer was created.'),
    entity_id: z.string().optional().describe('ID of the business entity associated with the transfer.'),
    sync_status: z.string().optional().describe('Accounting sync status of the transfer. Example: "SYNC_READY".')
});

const OutputSchema = z
    .object({
        items: z.array(TransferSchema).describe('Transfers matching the requested filters.'),
        next_cursor: z.string().optional().describe('Cursor to pass back as "cursor" to fetch the next page. Absent when there are no more results.')
    })
    .describe('A page of transfers and a cursor for the next page.');

const ProviderCurrencyAmountSchema = z.object({
    amount: z.number(),
    currency_code: z.string(),
    minor_unit_conversion_rate: z.number().nullable().optional()
});

const ProviderTransferSchema = z.object({
    id: z.string(),
    status: z.string().optional(),
    amount: ProviderCurrencyAmountSchema.optional(),
    bank_account_id: z.string().nullable().optional(),
    payment_id: z.string().optional(),
    created_at: z.string().optional(),
    entity_id: z.string().optional(),
    sync_status: z.string().optional()
});

const PaginatedResponseSchema = z.object({
    data: z.array(ProviderTransferSchema),
    page: z.object({ next: z.string().nullable() }).optional()
});

/**
 * @tags: [read]
 * @tagReason: Lists transfers between the business's bank accounts and its Ramp balance; it only reads data and never mutates provider state.
 * @pitfalls: from_date and to_date must be full ISO-8601 datetimes (a bare date like "2026-10-01" is rejected); amounts are returned in the currency's minor units (e.g. cents).
 */
const action = createAction({
    description: "List transfers between the business's bank accounts and its Ramp balance.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['transfers:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.ramp.com/openapi/developer-api.json - GET /developer/v1/transfers
            endpoint: '/developer/v1/transfers',
            params: {
                ...(input.cursor !== undefined && { start: input.cursor }),
                ...(input.from_date !== undefined && { from_date: input.from_date }),
                ...(input.to_date !== undefined && { to_date: input.to_date }),
                ...(input.status !== undefined && { status: input.status }),
                ...(input.entity_id !== undefined && { entity_id: input.entity_id }),
                ...(input.statement_id !== undefined && { statement_id: input.statement_id }),
                ...(input.page_size !== undefined && { page_size: input.page_size })
            },
            retries: 3
        });

        const parsed = PaginatedResponseSchema.parse(response.data);

        let next_cursor: string | undefined;
        const next = parsed.page?.next;
        if (next != null) {
            const start = new URL(next).searchParams.get('start');
            if (start != null && start.length > 0) {
                next_cursor = start;
            }
        }

        return {
            items: parsed.data.map((transfer) => ({
                id: transfer.id,
                ...(transfer.status != null && { status: transfer.status }),
                ...(transfer.amount != null && {
                    amount: {
                        amount: transfer.amount.amount,
                        currency_code: transfer.amount.currency_code,
                        ...(transfer.amount.minor_unit_conversion_rate != null && {
                            minor_unit_conversion_rate: transfer.amount.minor_unit_conversion_rate
                        })
                    }
                }),
                ...(transfer.bank_account_id != null && { bank_account_id: transfer.bank_account_id }),
                ...(transfer.payment_id != null && { payment_id: transfer.payment_id }),
                ...(transfer.created_at != null && { created_at: transfer.created_at }),
                ...(transfer.entity_id != null && { entity_id: transfer.entity_id }),
                ...(transfer.sync_status != null && { sync_status: transfer.sync_status })
            })),
            ...(next_cursor != null && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
