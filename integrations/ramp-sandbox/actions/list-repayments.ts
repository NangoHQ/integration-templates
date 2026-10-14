import { z } from 'zod';
import { createAction } from 'nango';

const FundingMethodSchema = z.enum(['ach', 'debit_card', 'export_for_payment', 'payroll', 'prefunded', 'push', 'repay_off_ramp']);

const SyncStatusSchema = z.enum(['IN_PROGRESS', 'MARKED_CANCELED', 'NOT_STARTED', 'SYNC_FAILURE', 'SYNC_SUCCESS']);

const InputSchema = z
    .object({
        cursor: z.string().min(1).optional().describe('Opaque pagination cursor returned as `next_cursor` by a previous call. Omit to fetch the first page.'),
        page_size: z
            .number()
            .int()
            .min(2)
            .max(100)
            .optional()
            .describe('Number of repayments to return per page, between 2 and 100. Defaults to the provider value (20).'),
        entity_id: z.string().optional().describe('Only return repayments belonging to this business entity. Example: "123e4567-e89b-12d3-a456-426614174000"'),
        user_id: z.string().optional().describe('Only return repayments made by this cardholder user. Example: "123e4567-e89b-12d3-a456-426614174000"'),
        original_transaction_id: z
            .string()
            .optional()
            .describe('Only return repayments settling this original card transaction. Example: "123e4567-e89b-12d3-a456-426614174000"'),
        funding_methods: z.array(FundingMethodSchema).optional().describe('Only return repayments funded by any of these methods.'),
        from_repaid_at: z
            .string()
            .optional()
            .describe('Only return repayments repaid at or after this time. Must be a full ISO 8601 datetime. Example: "2026-10-01T00:00:00Z"'),
        to_repaid_at: z
            .string()
            .optional()
            .describe('Only return repayments repaid at or before this time. Must be a full ISO 8601 datetime. Example: "2026-10-31T23:59:59Z"'),
        sync_status: SyncStatusSchema.optional().describe('Only return repayments whose latest accounting sync status matches this value.')
    })
    .describe('Filters and pagination options for listing off-Ramp card repayments.');

const ProviderRepaymentAmountSchema = z.object({
    amount: z.number(),
    currency_code: z.string(),
    minor_unit_conversion_rate: z.number().nullable()
});

const ProviderRepaymentSchema = z.object({
    id: z.string(),
    entity_id: z.string().optional(),
    status: z.string(),
    funding_method: z.string().nullable(),
    original_transaction_id: z.string().nullable(),
    repayment_amount: ProviderRepaymentAmountSchema.nullable(),
    repaid_at: z.string().nullable(),
    sync_status: z.string().nullable(),
    user_id: z.string().nullable(),
    user_signature: z.string().nullable()
});

const ProviderResponseSchema = z.object({
    data: z.array(ProviderRepaymentSchema),
    page: z.object({
        next: z.string().nullable()
    })
});

const RepaymentAmountSchema = z.object({
    amount: z.number().describe('Repayment amount in the smallest currency unit, e.g. cents for USD. Example: 14320'),
    currency_code: z.string().describe('ISO 4217 currency code of the repayment amount. Example: "USD"'),
    minor_unit_conversion_rate: z
        .number()
        .nullable()
        .describe('Factor converting the minor-unit amount to the real currency value (100 for USD). Null when unknown.')
});

const RepaymentSchema = z.object({
    id: z.string().describe('Unique identifier of the repayment. Example: "2141a4f1-0e1b-4984-a173-b099c5772ead"'),
    entity_id: z.string().optional().describe('Unique identifier of the associated business entity.'),
    status: z
        .string()
        .describe('Current repayment status. One of AWAITING_MANUAL_REPAYMENT, AWAITING_PAYMENT, NONE, REPAID, REPAYMENT_FAILED, REQUESTED_BY_REVIEWER.'),
    funding_method: z.string().optional().describe('Method used to fund the repayment, e.g. "repay_off_ramp", "ach" or "payroll". Omitted when unknown.'),
    original_transaction_id: z.string().optional().describe('Identifier of the original card transaction this repayment settles. Omitted when unknown.'),
    repayment_amount: RepaymentAmountSchema.optional().describe('Amount and currency repaid by the cardholder. Omitted when unavailable.'),
    repaid_at: z.string().optional().describe('ISO 8601 timestamp at which the repayment was repaid. Omitted when not yet repaid.'),
    sync_status: z.string().optional().describe('Latest accounting sync status of the repayment. Omitted when no sync has been attempted.'),
    user_id: z.string().optional().describe('Cardholder user identifier who made the repayment. Omitted when unknown.'),
    user_signature: z.string().optional().describe('Signature captured when the repayment agreement was accepted. Omitted when unavailable.')
});

const OutputSchema = z
    .object({
        repayments: z.array(RepaymentSchema).describe('Repayments matching the requested filters, sorted by creation date descending.'),
        next_cursor: z.string().optional().describe('Opaque cursor to pass as `cursor` to fetch the next page. Omitted when there are no more results.')
    })
    .describe('A page of off-Ramp card repayments with an optional cursor for the next page.');

/**
 * @tags: [read]
 * @tagReason: Lists repayment records from the provider and does not create, modify, or delete any provider state.
 * @pitfalls: from_repaid_at and to_repaid_at require full ISO 8601 datetimes; a bare date is rejected. Results are sorted by creation date descending, not by repayment date, so ordering may not line up with the from_repaid_at/to_repaid_at window.
 */
const action = createAction({
    description: 'List off-Ramp card repayments (e.g. a cardholder reimbursing the business for a disallowed personal charge).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.ramp.com/openapi/developer-api.json#/paths/~1developer~1v1~1repayments/get
            endpoint: '/developer/v1/repayments',
            params: {
                ...(input.cursor !== undefined && { start: input.cursor }),
                ...(input.page_size !== undefined && { page_size: input.page_size }),
                ...(input.entity_id !== undefined && { entity_id: input.entity_id }),
                ...(input.user_id !== undefined && { user_id: input.user_id }),
                ...(input.original_transaction_id !== undefined && { original_transaction_id: input.original_transaction_id }),
                ...(input.funding_methods !== undefined && { funding_methods: input.funding_methods }),
                ...(input.from_repaid_at !== undefined && { from_repaid_at: input.from_repaid_at }),
                ...(input.to_repaid_at !== undefined && { to_repaid_at: input.to_repaid_at }),
                ...(input.sync_status !== undefined && { sync_status: input.sync_status })
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);

        if (!parsed.success) {
            throw new Error('Unexpected response shape from the Ramp repayments endpoint.');
        }

        const repayments = parsed.data.data.map((repayment) => ({
            id: repayment.id,
            status: repayment.status,
            ...(repayment.entity_id != null && { entity_id: repayment.entity_id }),
            ...(repayment.funding_method != null && { funding_method: repayment.funding_method }),
            ...(repayment.original_transaction_id != null && { original_transaction_id: repayment.original_transaction_id }),
            ...(repayment.repayment_amount != null && {
                repayment_amount: {
                    amount: repayment.repayment_amount.amount,
                    currency_code: repayment.repayment_amount.currency_code,
                    minor_unit_conversion_rate: repayment.repayment_amount.minor_unit_conversion_rate
                }
            }),
            ...(repayment.repaid_at != null && { repaid_at: repayment.repaid_at }),
            ...(repayment.sync_status != null && { sync_status: repayment.sync_status }),
            ...(repayment.user_id != null && { user_id: repayment.user_id }),
            ...(repayment.user_signature != null && { user_signature: repayment.user_signature })
        }));

        const nextUrl = parsed.data.page.next;
        const nextCursor = nextUrl != null ? new URL(nextUrl).searchParams.get('start') : null;

        return {
            repayments,
            ...(nextCursor != null && nextCursor.length > 0 && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
