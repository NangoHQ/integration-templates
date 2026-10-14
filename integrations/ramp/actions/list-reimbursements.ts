import { z } from 'zod';
import { createAction } from 'nango';

const ReimbursementStateSchema = z.enum([
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
]);

const ReimbursementDirectionSchema = z.enum(['BUSINESS_TO_USER', 'USER_TO_BUSINESS']);

// Provider schemas mirror the Ramp Reimbursement object: spec-nullable fields are .nullable(); fields that are not in the
// published required list (legacy amounts, trace_id, expense_group, ...) can be absent or null, so they use .nullish().
const ProviderCurrencyAmountSchema = z.object({
    amount: z.number(),
    currency_code: z.string(),
    minor_unit_conversion_rate: z.number().nullish()
});

const ProviderReimbursementAmountSchema = z.object({
    currency: z.string(),
    value: z.number(),
    minor_unit_conversion_rate: z.number().nullish()
});

const ProviderAccountingFieldSelectionSchema = z.object({
    id: z.string().nullish(),
    external_id: z.string().nullish(),
    external_code: z.string().nullish(),
    name: z.string().nullish(),
    display_name: z.string().nullish(),
    provider_name: z.string().nullish(),
    type: z.string().nullish(),
    source: z.object({ type: z.string() }).nullish(),
    category_info: z
        .object({
            id: z.string().nullish(),
            external_id: z.string().nullish(),
            name: z.string().nullish(),
            type: z.string().nullish()
        })
        .nullish()
});

const ProviderReimbursementSchema = z.object({
    id: z.string(),
    state: z.string(),
    type: z.string(),
    direction: z.string(),
    sync_status: z.string(),
    funding_source: z.string().nullish(),
    user_id: z.string(),
    user_email: z.string(),
    user_full_name: z.string(),
    employee_id: z.string().nullable(),
    entity_id: z.string().nullable(),
    fund_id: z.string().nullable(),
    spend_limit_id: z.string().nullable(),
    trip_id: z.string().nullable(),
    merchant: z.string().nullable(),
    merchant_id: z.string().nullable(),
    memo: z.string().nullable(),
    amount: z.number().nullish(),
    currency: z.string().nullish(),
    original_reimbursement_amount: ProviderCurrencyAmountSchema.nullish(),
    payee_amount: ProviderCurrencyAmountSchema.nullable(),
    entity_amount: ProviderReimbursementAmountSchema.nullable(),
    merchant_amount: ProviderReimbursementAmountSchema.nullable(),
    accounting_date: z.string().nullable(),
    approved_at: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string().nullable(),
    submitted_at: z.string().nullable(),
    synced_at: z.string().nullable(),
    payment_processed_at: z.string().nullable(),
    transaction_date: z.string().nullable(),
    distance: z.number().nullable(),
    start_location: z.string().nullable(),
    end_location: z.string().nullable(),
    // The spec declares waypoints as a non-null array, but live responses return null for non-mileage reimbursements.
    waypoints: z.array(z.string()).nullable(),
    attendees: z.array(
        z.object({
            name: z.string(),
            user_id: z.string().nullable()
        })
    ),
    line_items: z.array(
        z.object({
            amount: ProviderCurrencyAmountSchema.nullable(),
            memo: z.string().nullable(),
            accounting_field_selections: z.array(ProviderAccountingFieldSelectionSchema)
        })
    ),
    receipts: z.array(z.string()),
    accounting_field_selections: z.array(ProviderAccountingFieldSelectionSchema),
    payment_batch_id: z.string().nullable(),
    payment_id: z.string().nullable(),
    repayment_transaction_id: z.string().nullish(),
    trace_id: z
        .object({
            descriptor: z.string().nullable(),
            trace_id: z.string().nullable()
        })
        .nullish(),
    expense_group: z
        .object({
            id: z.string().nullish(),
            name: z.string().nullish()
        })
        .nullish()
});

const CurrencyAmountSchema = z.object({
    amount: z.number().describe('Amount in the currency minor unit (e.g. cents). Example: 9337'),
    currency_code: z.string().describe('ISO 4217 currency code. Example: "USD"'),
    minor_unit_conversion_rate: z.number().optional().describe('Number of minor units per major unit. Example: 100')
});

const ReimbursementAmountSchema = z.object({
    currency: z.string().describe('ISO 4217 currency code. Example: "USD"'),
    value: z.number().describe('Amount in the currency minor unit (e.g. cents). Example: 9337'),
    minor_unit_conversion_rate: z.number().optional().describe('Number of minor units per major unit. Example: 100')
});

const AccountingCategoryInfoSchema = z.object({
    id: z.string().optional().describe('Unique identifier of the parent accounting category within Ramp.'),
    external_id: z.string().optional().describe('External ID of the parent accounting category in the ERP.'),
    name: z.string().optional().describe('Name of the parent accounting category.'),
    type: z.string().optional().describe('Type of the parent accounting category, e.g. "GL_ACCOUNT".')
});

const AccountingFieldSelectionSchema = z.object({
    id: z.string().optional().describe('Unique identifier for this accounting option within Ramp.'),
    external_id: z.string().optional().describe('External ID that uniquely identifies this option in the ERP.'),
    external_code: z.string().optional().describe('External code displayed in the ERP for this option.'),
    name: z.string().optional().describe('Name of the accounting field option.'),
    display_name: z.string().optional().describe('Ramp display name for the option, when overridden.'),
    provider_name: z.string().optional().describe('Name of the accounting field provider.'),
    type: z.string().optional().describe('Type of accounting field, e.g. "GL_ACCOUNT".'),
    source: z
        .object({
            type: z.string().describe('Source type of the accounting coding selection.')
        })
        .optional()
        .describe('Source of this accounting coding selection.'),
    category_info: AccountingCategoryInfoSchema.optional().describe('Information about the parent accounting category.')
});

const LineItemSchema = z.object({
    amount: CurrencyAmountSchema.optional().describe('Amount of the line item.'),
    memo: z.string().optional().describe('Memo attached to the line item.'),
    accounting_field_selections: z.array(AccountingFieldSelectionSchema).describe('Accounting fields selected to code the line item.')
});

const AttendeeSchema = z.object({
    name: z.string().describe('Name of the attendee.'),
    user_id: z.string().optional().describe('Ramp user ID of the attendee, when the attendee is a Ramp user.')
});

const TraceIdSchema = z.object({
    descriptor: z.string().optional().describe('Label describing the trace reference, e.g. "Trace ID".'),
    trace_id: z.string().optional().describe('Bank-facing accountability reference for the reimbursement payment.')
});

const ExpenseGroupSchema = z.object({
    id: z.string().optional().describe('Unique identifier of the expense group.'),
    name: z.string().optional().describe('Name of the expense group.')
});

const ReimbursementSchema = z.object({
    id: z.string().describe('Unique identifier of the reimbursement. Example: "e29e1b3b-5563-4ecf-b655-320f8ac04a12"'),
    state: z
        .string()
        .describe(
            'Current state of the reimbursement (e.g. PENDING, APPROVED, REIMBURSED, CANCELED, DELETED). Kept as a string so new Ramp states do not fail parsing.'
        ),
    type: z.string().describe('Type of the reimbursement (e.g. OUT_OF_POCKET, MILEAGE, PER_DIEM, PAYBACK_FULL, PAYBACK_PARTIAL).'),
    direction: z.string().describe('Direction of the reimbursement: BUSINESS_TO_USER, or USER_TO_BUSINESS for repayments.'),
    sync_status: z.string().describe('Accounting sync status of the reimbursement (e.g. NOT_SYNC_READY, SYNC_READY, SYNCED).'),
    funding_source: z
        .string()
        .optional()
        .describe('Funding classification (e.g. RAMP_FUNDED, NOT_RAMP_FUNDED, PAID_OUTSIDE_RAMP, PENDING). Omitted when Ramp cannot determine it.'),
    user_id: z.string().describe('Unique identifier of the person who submitted the reimbursement.'),
    user_email: z.string().describe('Email of the person who submitted the reimbursement.'),
    user_full_name: z.string().describe('Full name of the person who submitted the reimbursement.'),
    employee_id: z.string().optional().describe('Employee ID of the person who submitted the reimbursement.'),
    entity_id: z.string().optional().describe('Unique identifier of the associated business entity.'),
    fund_id: z.string().optional().describe('Fund the reimbursement is attributed to, when it exists.'),
    spend_limit_id: z.string().optional().describe('Deprecated alias of fund_id.'),
    trip_id: z.string().optional().describe('Trip ID associated with the reimbursement, when available.'),
    merchant: z.string().optional().describe('Name of the merchant associated with the reimbursement.'),
    merchant_id: z.string().optional().describe('Unique identifier of the merchant, when Ramp recognizes it.'),
    memo: z.string().optional().describe('Reimbursement memo.'),
    amount: z.number().optional().describe('Legacy reimbursement amount in major currency units. Prefer entity_amount.'),
    currency: z.string().optional().describe('Legacy ISO 4217 currency code. Prefer entity_amount.'),
    original_reimbursement_amount: CurrencyAmountSchema.optional().describe('Legacy originally submitted amount. Prefer merchant_amount.'),
    payee_amount: CurrencyAmountSchema.optional().describe('Amount and currency received by the payee.'),
    entity_amount: ReimbursementAmountSchema.optional().describe('Amount the payor entity pays, in the entity settlement currency.'),
    merchant_amount: ReimbursementAmountSchema.optional().describe('Amount originally submitted, in the submission currency.'),
    accounting_date: z.string().optional().describe('Date used for accounting purposes (ISO 8601).'),
    approved_at: z.string().optional().describe('Time the reimbursement was approved (ISO 8601).'),
    created_at: z.string().describe('Time the reimbursement was created (ISO 8601).'),
    updated_at: z.string().optional().describe('Time the reimbursement was last updated (ISO 8601).'),
    submitted_at: z.string().optional().describe('Time the reimbursement was most recently submitted (ISO 8601).'),
    synced_at: z.string().optional().describe('Time the reimbursement was synced to the accounting provider (ISO 8601).'),
    payment_processed_at: z.string().optional().describe('Time the reimbursement payment was processed (ISO 8601).'),
    transaction_date: z.string().optional().describe('Date of the underlying transaction (YYYY-MM-DD).'),
    distance: z.number().optional().describe('Distance in miles, for mileage reimbursements.'),
    start_location: z.string().optional().describe('Starting location of the trip, for mileage reimbursements.'),
    end_location: z.string().optional().describe('Ending location of the trip, for mileage reimbursements.'),
    waypoints: z.array(z.string()).optional().describe('Intermediate stops during the trip, for mileage reimbursements.'),
    attendees: z.array(AttendeeSchema).describe('Attendees associated with the reimbursement.'),
    line_items: z.array(LineItemSchema).describe('Line items related to the reimbursement.'),
    receipts: z.array(z.string()).describe('IDs of receipts attached to the reimbursement.'),
    accounting_field_selections: z.array(AccountingFieldSelectionSchema).describe('Accounting fields selected to code the reimbursement.'),
    payment_batch_id: z.string().optional().describe('Unique identifier of the reimbursement payment batch.'),
    payment_id: z.string().optional().describe('Unique identifier of the payment, once paid.'),
    repayment_transaction_id: z.string().optional().describe('Transaction ID of the repayment, for USER_TO_BUSINESS reimbursements.'),
    trace_id: TraceIdSchema.optional().describe('Bank-facing accountability reference for the payment, when available.'),
    expense_group: ExpenseGroupSchema.optional().describe('Expense group the reimbursement belongs to, when available.')
});

function mapCurrencyAmount(amount: z.infer<typeof ProviderCurrencyAmountSchema>): z.infer<typeof CurrencyAmountSchema> {
    return {
        amount: amount.amount,
        currency_code: amount.currency_code,
        ...(amount.minor_unit_conversion_rate != null && { minor_unit_conversion_rate: amount.minor_unit_conversion_rate })
    };
}

function mapReimbursementAmount(amount: z.infer<typeof ProviderReimbursementAmountSchema>): z.infer<typeof ReimbursementAmountSchema> {
    return {
        currency: amount.currency,
        value: amount.value,
        ...(amount.minor_unit_conversion_rate != null && { minor_unit_conversion_rate: amount.minor_unit_conversion_rate })
    };
}

function mapAccountingFieldSelection(selection: z.infer<typeof ProviderAccountingFieldSelectionSchema>): z.infer<typeof AccountingFieldSelectionSchema> {
    const categoryInfo = selection.category_info;

    return {
        ...(selection.id != null && { id: selection.id }),
        ...(selection.external_id != null && { external_id: selection.external_id }),
        ...(selection.external_code != null && { external_code: selection.external_code }),
        ...(selection.name != null && { name: selection.name }),
        ...(selection.display_name != null && { display_name: selection.display_name }),
        ...(selection.provider_name != null && { provider_name: selection.provider_name }),
        ...(selection.type != null && { type: selection.type }),
        ...(selection.source != null && { source: { type: selection.source.type } }),
        ...(categoryInfo != null && {
            category_info: {
                ...(categoryInfo.id != null && { id: categoryInfo.id }),
                ...(categoryInfo.external_id != null && { external_id: categoryInfo.external_id }),
                ...(categoryInfo.name != null && { name: categoryInfo.name }),
                ...(categoryInfo.type != null && { type: categoryInfo.type })
            }
        })
    };
}

function mapReimbursement(reimbursement: z.infer<typeof ProviderReimbursementSchema>): z.infer<typeof ReimbursementSchema> {
    const traceId = reimbursement.trace_id;
    const expenseGroup = reimbursement.expense_group;

    return {
        id: reimbursement.id,
        state: reimbursement.state,
        type: reimbursement.type,
        direction: reimbursement.direction,
        sync_status: reimbursement.sync_status,
        ...(reimbursement.funding_source != null && { funding_source: reimbursement.funding_source }),
        user_id: reimbursement.user_id,
        user_email: reimbursement.user_email,
        user_full_name: reimbursement.user_full_name,
        ...(reimbursement.employee_id != null && { employee_id: reimbursement.employee_id }),
        ...(reimbursement.entity_id != null && { entity_id: reimbursement.entity_id }),
        ...(reimbursement.fund_id != null && { fund_id: reimbursement.fund_id }),
        ...(reimbursement.spend_limit_id != null && { spend_limit_id: reimbursement.spend_limit_id }),
        ...(reimbursement.trip_id != null && { trip_id: reimbursement.trip_id }),
        ...(reimbursement.merchant != null && { merchant: reimbursement.merchant }),
        ...(reimbursement.merchant_id != null && { merchant_id: reimbursement.merchant_id }),
        ...(reimbursement.memo != null && { memo: reimbursement.memo }),
        ...(reimbursement.amount != null && { amount: reimbursement.amount }),
        ...(reimbursement.currency != null && { currency: reimbursement.currency }),
        ...(reimbursement.original_reimbursement_amount != null && {
            original_reimbursement_amount: mapCurrencyAmount(reimbursement.original_reimbursement_amount)
        }),
        ...(reimbursement.payee_amount != null && { payee_amount: mapCurrencyAmount(reimbursement.payee_amount) }),
        ...(reimbursement.entity_amount != null && { entity_amount: mapReimbursementAmount(reimbursement.entity_amount) }),
        ...(reimbursement.merchant_amount != null && { merchant_amount: mapReimbursementAmount(reimbursement.merchant_amount) }),
        ...(reimbursement.accounting_date != null && { accounting_date: reimbursement.accounting_date }),
        ...(reimbursement.approved_at != null && { approved_at: reimbursement.approved_at }),
        created_at: reimbursement.created_at,
        ...(reimbursement.updated_at != null && { updated_at: reimbursement.updated_at }),
        ...(reimbursement.submitted_at != null && { submitted_at: reimbursement.submitted_at }),
        ...(reimbursement.synced_at != null && { synced_at: reimbursement.synced_at }),
        ...(reimbursement.payment_processed_at != null && { payment_processed_at: reimbursement.payment_processed_at }),
        ...(reimbursement.transaction_date != null && { transaction_date: reimbursement.transaction_date }),
        ...(reimbursement.distance != null && { distance: reimbursement.distance }),
        ...(reimbursement.start_location != null && { start_location: reimbursement.start_location }),
        ...(reimbursement.end_location != null && { end_location: reimbursement.end_location }),
        ...(reimbursement.waypoints != null && { waypoints: reimbursement.waypoints }),
        attendees: reimbursement.attendees.map((attendee) => ({
            name: attendee.name,
            ...(attendee.user_id != null && { user_id: attendee.user_id })
        })),
        line_items: reimbursement.line_items.map((lineItem) => ({
            ...(lineItem.amount != null && { amount: mapCurrencyAmount(lineItem.amount) }),
            ...(lineItem.memo != null && { memo: lineItem.memo }),
            accounting_field_selections: lineItem.accounting_field_selections.map(mapAccountingFieldSelection)
        })),
        receipts: reimbursement.receipts,
        accounting_field_selections: reimbursement.accounting_field_selections.map(mapAccountingFieldSelection),
        ...(reimbursement.payment_batch_id != null && { payment_batch_id: reimbursement.payment_batch_id }),
        ...(reimbursement.payment_id != null && { payment_id: reimbursement.payment_id }),
        ...(reimbursement.repayment_transaction_id != null && { repayment_transaction_id: reimbursement.repayment_transaction_id }),
        ...(traceId != null && {
            trace_id: {
                ...(traceId.descriptor != null && { descriptor: traceId.descriptor }),
                ...(traceId.trace_id != null && { trace_id: traceId.trace_id })
            }
        }),
        ...(expenseGroup != null && {
            expense_group: {
                ...(expenseGroup.id != null && { id: expenseGroup.id }),
                ...(expenseGroup.name != null && { name: expenseGroup.name })
            }
        })
    };
}

const InputSchema = z
    .object({
        cursor: z
            .string()
            .regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)
            .optional()
            .describe('Pagination cursor returned as next_cursor by a previous call. Omit to fetch the first page.'),
        page_size: z.number().int().min(2).max(100).optional().describe('Number of results per page, between 2 and 100. Defaults to 20.'),
        direction: ReimbursementDirectionSchema.optional().describe('Filter by reimbursement direction. Defaults to BUSINESS_TO_USER.'),
        state: ReimbursementStateSchema.optional().describe('Filter by reimbursement state. Example: "PENDING"'),
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
    data: z.array(ProviderReimbursementSchema),
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
            items: parsed.data.map(mapReimbursement),
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
