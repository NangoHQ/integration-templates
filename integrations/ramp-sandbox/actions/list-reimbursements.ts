import { z } from 'zod';
import { createAction } from 'nango';

const AmountSchema = z.object({
    currency: z.string().optional().describe('ISO 4217 currency code of the amount. Example: "USD"'),
    minor_unit_conversion_rate: z
        .number()
        .nullable()
        .optional()
        .describe('Factor to divide the integer value by to get the real currency amount. Example: 100'),
    value: z.number().optional().describe('Amount in the smallest denomination of the currency (e.g. cents for USD).')
});

const CurrencyAmountSchema = z.object({
    amount: z.number().optional().describe('Amount in the smallest denomination of the currency (e.g. cents for USD).'),
    currency_code: z.string().optional().describe('ISO 4217 currency code of the amount. Example: "USD"'),
    minor_unit_conversion_rate: z.number().nullable().optional().describe('Factor to divide the integer amount by to get the real currency value. Example: 100')
});

const AttendeeSchema = z.object({
    name: z.string().optional().describe('Full name of the attendee.'),
    user_id: z.string().nullable().optional().describe('Ramp user ID of the attendee when the attendee is a linked Ramp user; null otherwise.')
});

const AccountingFieldSelectionSchema = z.object({
    id: z.string().nullable().optional().describe('Unique identifier of the accounting field option within Ramp.'),
    name: z.string().nullable().optional().describe('Name of the accounting field option.'),
    display_name: z.string().nullable().optional().describe('Customer-set display name of the accounting field option when renamed inside Ramp.'),
    external_id: z.string().nullable().optional().describe('External ID of the option in the connected ERP.'),
    external_code: z.string().nullable().optional().describe('External code of the option in the connected ERP.'),
    provider_name: z.string().nullable().optional().describe('Name of the accounting provider that owns the option.'),
    type: z.string().nullable().optional().describe('Accounting field type. Example: "GL_ACCOUNT"'),
    category_info: z
        .object({
            id: z.string().nullable().optional().describe('Unique identifier of the parent accounting field within Ramp.'),
            name: z.string().nullable().optional().describe('Name of the parent accounting field.'),
            external_id: z.string().nullable().optional().describe('External ID of the parent accounting field in the connected ERP.'),
            type: z.string().nullable().optional().describe('Type of the parent accounting field. Example: "GL_ACCOUNT"')
        })
        .nullable()
        .optional()
        .describe('Information about the parent accounting category, when available.'),
    source: z
        .object({
            type: z.string().optional().describe('Type of source that added this accounting selection. Example: "RAMP"')
        })
        .nullable()
        .optional()
        .describe('Source that produced this accounting coding selection.')
});

const LineItemSchema = z.object({
    amount: CurrencyAmountSchema.nullable().optional().describe('Amount of the line item.'),
    memo: z.string().nullable().optional().describe('Memo text for this line item.'),
    accounting_field_selections: z.array(AccountingFieldSelectionSchema).optional().describe('Accounting field selections used to code this line item.')
});

const ExpenseGroupSchema = z.object({
    id: z.string().optional().describe('Unique identifier of the expense group.'),
    name: z.string().optional().describe('Name of the expense group.')
});

const ReimbursementSchema = z.object({
    id: z.string().describe('Unique identifier of the reimbursement.'),
    user_id: z.string().nullable().optional().describe('Ramp user ID of the person who submitted the reimbursement.'),
    user_email: z.string().nullable().optional().describe('Email of the person who submitted the reimbursement.'),
    user_full_name: z.string().nullable().optional().describe('Full name of the person who submitted the reimbursement.'),
    employee_id: z.string().nullable().optional().describe('Employee ID of the person who submitted the reimbursement.'),
    direction: z.string().optional().describe('Direction of the reimbursement. Example: "BUSINESS_TO_USER"'),
    state: z.string().optional().describe('Current state of the reimbursement. Example: "PENDING"'),
    type: z.string().optional().describe('Reimbursement type. Example: "OUT_OF_POCKET"'),
    memo: z.string().nullable().optional().describe('Reimbursement memo.'),
    amount: z.number().nullable().optional().describe('Legacy total amount in major currency units. Example: 12.34'),
    currency: z.string().nullable().optional().describe('Legacy ISO 4217 currency code of the reimbursement. Example: "USD"'),
    transaction_date: z.string().nullable().optional().describe('Date of the underlying transaction. Example: "2026-10-14"'),
    accounting_date: z.string().nullable().optional().describe('Date used for accounting purposes; falls back to the transaction date when unset.'),
    created_at: z.string().optional().describe('ISO-8601 timestamp when the reimbursement was created.'),
    updated_at: z.string().nullable().optional().describe('ISO-8601 timestamp when the reimbursement was last updated.'),
    submitted_at: z.string().nullable().optional().describe('ISO-8601 timestamp when the reimbursement was most recently submitted.'),
    approved_at: z.string().nullable().optional().describe('ISO-8601 timestamp when the reimbursement was approved.'),
    payment_processed_at: z.string().nullable().optional().describe('ISO-8601 timestamp when the reimbursement was paid.'),
    synced_at: z.string().nullable().optional().describe('ISO-8601 timestamp when the reimbursement was synced to the accounting provider.'),
    merchant: z.string().nullable().optional().describe('Name of the merchant associated with the reimbursement.'),
    merchant_id: z.string().nullable().optional().describe('Ramp merchant ID, when the merchant is recognized.'),
    merchant_amount: AmountSchema.nullable().optional().describe('Amount originally submitted in its original currency.'),
    entity_amount: AmountSchema.nullable().optional().describe('Amount the payor entity pays in its settlement currency.'),
    payee_amount: CurrencyAmountSchema.nullable().optional().describe('Amount and currency received by the payee.'),
    original_reimbursement_amount: CurrencyAmountSchema.nullable().optional().describe('Legacy original submitted amount.'),
    entity_id: z.string().nullable().optional().describe('Ramp business entity ID associated with the reimbursement.'),
    fund_id: z.string().nullable().optional().describe('Ramp fund ID the reimbursement is attributed to.'),
    spend_limit_id: z.string().nullable().optional().describe('Deprecated alias of fund_id.'),
    trip_id: z.string().nullable().optional().describe('Ramp trip ID associated with the reimbursement.'),
    funding_source: z.string().nullable().optional().describe('Funding classification. Example: "RAMP_FUNDED"'),
    sync_status: z.string().nullable().optional().describe('Accounting sync status. Example: "SYNC_READY"'),
    payment_id: z.string().nullable().optional().describe('Payment identifier once paid.'),
    payment_batch_id: z.string().nullable().optional().describe('Payment batch identifier associated with the reimbursement.'),
    repayment_transaction_id: z.string().nullable().optional().describe('Transaction ID of the repayment, for USER_TO_BUSINESS reimbursements.'),
    start_location: z.string().nullable().optional().describe('Starting location of a mileage trip.'),
    end_location: z.string().nullable().optional().describe('Ending location of a mileage trip.'),
    distance: z.number().nullable().optional().describe('Mileage trip distance in miles.'),
    waypoints: z.array(z.string()).nullable().optional().describe('Intermediate stops during a mileage trip.'),
    receipts: z.array(z.string()).nullable().optional().describe('IDs of receipts attached to the reimbursement.'),
    attendees: z.array(AttendeeSchema).nullable().optional().describe('Attendees associated with the reimbursement.'),
    line_items: z.array(LineItemSchema).nullable().optional().describe('Line items that make up the reimbursement.'),
    accounting_field_selections: z.array(AccountingFieldSelectionSchema).nullable().optional().describe('Accounting fields used to code the reimbursement.'),
    expense_group: ExpenseGroupSchema.nullable().optional().describe('Expense group the reimbursement belongs to, when assigned.')
});

const InputSchema = z
    .object({
        cursor: z
            .string()
            .regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)
            .optional()
            .describe('Pagination cursor returned as next_cursor by a previous call. Omit to fetch the first page.'),
        page_size: z.number().int().min(2).max(100).optional().describe('Number of results per page, between 2 and 100. Defaults to 20.'),
        direction: z.enum(['BUSINESS_TO_USER', 'USER_TO_BUSINESS']).optional().describe('Filter by reimbursement direction. Defaults to BUSINESS_TO_USER.'),
        state: z
            .enum([
                'APPROVED',
                'AWAITING_EXPORT',
                'AWAITING_PAYMENT',
                'AWAITING_PUSH_PAYMENT',
                'CANCELED',
                'DELETED',
                'DRAFT',
                'EXPORTED',
                'EXPORT_FAILED',
                'EXPORT_INITIATED',
                'EXPORT_MARKED_AS_FAILED',
                'EXPORT_SUCCESSFUL',
                'FAILED_REIMBURSEMENT',
                'INIT',
                'MANUALLY_REIMBURSED',
                'MISSING_ACH',
                'PENDING',
                'PROCESSING',
                'PUSH_PAYMENT_FAILED',
                'PUSH_PAYMENT_INITIATED',
                'REIMBURSED',
                'REIMBURSED_VIA_PUSH',
                'REJECTED'
            ])
            .optional()
            .describe('Filter by reimbursement state. Example: "PENDING"'),
        updated_after: z
            .string()
            .optional()
            .describe('ISO-8601 datetime; only reimbursements updated on or after it are returned. Reliable incremental filter.'),
        from_transaction_date: z
            .string()
            .optional()
            .describe('ISO-8601 datetime; only reimbursements with an underlying transaction date on or after it are returned.'),
        to_transaction_date: z
            .string()
            .optional()
            .describe('ISO-8601 datetime; only reimbursements with an underlying transaction date on or before it are returned.'),
        trip_id: z.string().optional().describe('Filter by the Ramp trip ID associated with the reimbursement.'),
        awaiting_approval_by_user_id: z.string().optional().describe('Filter to reimbursements awaiting approval by this Ramp user ID.'),
        has_been_approved: z.boolean().optional().describe('Filter by whether the reimbursement has been approved.')
    })
    .describe('Filters for listing reimbursements.');

const PageSchema = z.object({
    next: z.string().nullable().optional()
});

const ResponseSchema = z.object({
    data: z.array(ReimbursementSchema),
    page: PageSchema.optional()
});

const OutputSchema = z
    .object({
        items: z.array(ReimbursementSchema).describe('Reimbursements matching the supplied filters.'),
        next_cursor: z.string().optional().describe('Cursor to pass as cursor to fetch the next page. Absent when there are no more pages.')
    })
    .describe('A page of reimbursements and the cursor for the next page.');

/**
 * @tags: [read]
 * @tagReason: Read-only GET that lists reimbursements; it does not modify any provider state.
 * @pitfalls: direction defaults to BUSINESS_TO_USER, so USER_TO_BUSINESS repayments are omitted unless explicitly requested; date filters require full ISO-8601 datetimes (a bare date returns HTTP 422); the legacy amount/currency fields are in major units while entity_amount, merchant_amount and payee_amount are in minor units.
 */
const action = createAction({
    description: 'List out-of-pocket and mileage reimbursements.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['reimbursements:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.ramp.com/openapi/developer-api.json (GET /developer/v1/reimbursements)
            endpoint: '/developer/v1/reimbursements',
            params: {
                ...(input.cursor !== undefined && { start: input.cursor }),
                ...(input.page_size !== undefined && { page_size: input.page_size }),
                ...(input.direction !== undefined && { direction: input.direction }),
                ...(input.state !== undefined && { state: input.state }),
                ...(input.updated_after !== undefined && { updated_after: input.updated_after }),
                ...(input.from_transaction_date !== undefined && { from_transaction_date: input.from_transaction_date }),
                ...(input.to_transaction_date !== undefined && { to_transaction_date: input.to_transaction_date }),
                ...(input.trip_id !== undefined && { trip_id: input.trip_id }),
                ...(input.awaiting_approval_by_user_id !== undefined && { awaiting_approval_by_user_id: input.awaiting_approval_by_user_id }),
                ...(input.has_been_approved !== undefined && { has_been_approved: String(input.has_been_approved) })
            },
            retries: 3
        });

        const parsed = ResponseSchema.parse(response.data);
        const next = parsed.page?.next;

        let next_cursor: string | undefined;
        if (next != null && URL.canParse(next)) {
            const start = new URL(next).searchParams.get('start');
            if (start != null && start.length > 0) {
                next_cursor = start;
            }
        }

        return {
            items: parsed.data,
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
