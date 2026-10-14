import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        reimbursement_id: z.string().describe('Unique identifier of the reimbursement. Example: "e29e1b3b-5563-4ecf-b655-320f8ac04a12"')
    })
    .describe('Input for retrieving a single reimbursement.');

const CurrencyAmountSchema = z.object({
    amount: z.number().describe('Amount in the currency minor unit (e.g. cents). Example: 9337'),
    currency_code: z.string().describe('ISO 4217 currency code. Example: "USD"'),
    minor_unit_conversion_rate: z.number().nullable().optional().describe('Number of minor units per major unit. Example: 100')
});

const ReimbursementAmountSchema = z.object({
    currency: z.string().describe('ISO 4217 currency code. Example: "USD"'),
    value: z.number().describe('Amount in the currency minor unit (e.g. cents). Example: 9337'),
    minor_unit_conversion_rate: z.number().nullable().optional().describe('Number of minor units per major unit. Example: 100')
});

const AccountingCategoryInfoSchema = z.object({
    id: z.string().nullable().optional().describe('Unique identifier of the parent accounting category within Ramp.'),
    external_id: z.string().nullable().optional().describe('External ID of the parent accounting category in the ERP.'),
    name: z.string().nullable().optional().describe('Name of the parent accounting category.'),
    type: z.string().nullable().optional().describe('Type of the parent accounting category, e.g. "GL_ACCOUNT".')
});

const AccountingFieldSelectionSchema = z.object({
    id: z.string().nullable().optional().describe('Unique identifier for this accounting option within Ramp.'),
    external_id: z.string().nullable().optional().describe('External ID that uniquely identifies this option in the ERP.'),
    external_code: z.string().nullable().optional().describe('External code displayed in the ERP for this option.'),
    name: z.string().nullable().optional().describe('Name of the accounting field option.'),
    display_name: z.string().nullable().optional().describe('Ramp display name for the option, when overridden.'),
    provider_name: z.string().nullable().optional().describe('Name of the accounting field provider.'),
    type: z.string().nullable().optional().describe('Type of accounting field, e.g. "GL_ACCOUNT".'),
    source: z
        .object({
            type: z.string().describe('Source type of the accounting coding selection.')
        })
        .nullable()
        .optional()
        .describe('Source of this accounting coding selection.'),
    category_info: AccountingCategoryInfoSchema.nullable().optional().describe('Information about the parent accounting category.')
});

const LineItemSchema = z.object({
    amount: CurrencyAmountSchema.nullable().optional().describe('Amount of the line item.'),
    memo: z.string().nullable().optional().describe('Memo attached to the line item.'),
    accounting_field_selections: z.array(AccountingFieldSelectionSchema).optional().describe('Accounting fields selected to code the line item.')
});

const AttendeeSchema = z.object({
    name: z.string().describe('Name of the attendee.'),
    user_id: z.string().nullable().optional().describe('Ramp user ID of the attendee, when the attendee is a Ramp user.')
});

const TraceIdSchema = z.object({
    descriptor: z.string().nullable().optional().describe('Label describing the trace reference, e.g. "Trace ID".'),
    trace_id: z.string().nullable().optional().describe('Bank-facing accountability reference for the reimbursement payment.')
});

const ExpenseGroupSchema = z.object({
    id: z.string().nullable().optional().describe('Unique identifier of the expense group.'),
    name: z.string().nullable().optional().describe('Name of the expense group.')
});

const OutputSchema = z
    .object({
        id: z.string().describe('Unique identifier of the reimbursement. Example: "e29e1b3b-5563-4ecf-b655-320f8ac04a12"'),
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
            .describe('Current state of the reimbursement.'),
        type: z.enum(['MILEAGE', 'OUT_OF_POCKET', 'PAYBACK_FULL', 'PAYBACK_PARTIAL', 'PER_DIEM']).describe('Type of the reimbursement.'),
        direction: z.enum(['BUSINESS_TO_USER', 'USER_TO_BUSINESS']).describe('Direction of the reimbursement.'),
        sync_status: z.enum(['NOT_SYNC_READY', 'SYNCED', 'SYNC_READY']).describe('Accounting sync status of the reimbursement.'),
        funding_source: z
            .enum(['NOT_RAMP_FUNDED', 'PAID_OUTSIDE_RAMP', 'PENDING', 'RAMP_FUNDED'])
            .nullable()
            .optional()
            .describe('Funding classification for the reimbursement; null when it cannot be determined.'),
        user_id: z.string().describe('Unique identifier of the person who submitted the reimbursement.'),
        user_email: z.string().describe('Email of the person who submitted the reimbursement.'),
        user_full_name: z.string().describe('Full name of the person who submitted the reimbursement.'),
        employee_id: z.string().nullable().optional().describe('Employee ID of the person who submitted the reimbursement.'),
        entity_id: z.string().nullable().optional().describe('Unique identifier of the associated business entity.'),
        fund_id: z.string().nullable().optional().describe('Fund the reimbursement is attributed to, when it exists.'),
        spend_limit_id: z.string().nullable().optional().describe('Deprecated alias of fund_id.'),
        trip_id: z.string().nullable().optional().describe('Trip ID associated with the reimbursement, when available.'),
        merchant: z.string().nullable().optional().describe('Name of the merchant associated with the reimbursement.'),
        merchant_id: z.string().nullable().optional().describe('Unique identifier of the merchant, when Ramp recognizes it.'),
        memo: z.string().nullable().optional().describe('Reimbursement memo.'),
        amount: z.number().nullable().optional().describe('Legacy reimbursement amount in major currency units. Prefer entity_amount.'),
        currency: z.string().nullable().optional().describe('Legacy ISO 4217 currency code. Prefer entity_amount.'),
        original_reimbursement_amount: CurrencyAmountSchema.nullable().optional().describe('Legacy originally submitted amount. Prefer merchant_amount.'),
        payee_amount: CurrencyAmountSchema.nullable().optional().describe('Amount and currency received by the payee.'),
        entity_amount: ReimbursementAmountSchema.nullable().optional().describe('Amount the payor entity pays, in the entity settlement currency.'),
        merchant_amount: ReimbursementAmountSchema.nullable().optional().describe('Amount originally submitted, in the submission currency.'),
        accounting_date: z.string().nullable().optional().describe('Date used for accounting purposes (ISO 8601).'),
        approved_at: z.string().nullable().optional().describe('Time the reimbursement was approved (ISO 8601).'),
        created_at: z.string().describe('Time the reimbursement was created (ISO 8601).'),
        updated_at: z.string().nullable().optional().describe('Time the reimbursement was last updated (ISO 8601).'),
        submitted_at: z.string().nullable().optional().describe('Time the reimbursement was most recently submitted (ISO 8601).'),
        synced_at: z.string().nullable().optional().describe('Time the reimbursement was synced to the accounting provider (ISO 8601).'),
        payment_processed_at: z.string().nullable().optional().describe('Time the reimbursement payment was processed (ISO 8601).'),
        transaction_date: z.string().nullable().optional().describe('Date of the underlying transaction (YYYY-MM-DD).'),
        distance: z.number().nullable().optional().describe('Distance in miles, for mileage reimbursements.'),
        start_location: z.string().nullable().optional().describe('Starting location of the trip, for mileage reimbursements.'),
        end_location: z.string().nullable().optional().describe('Ending location of the trip, for mileage reimbursements.'),
        waypoints: z.array(z.string()).nullable().optional().describe('Intermediate stops during the trip, for mileage reimbursements.'),
        attendees: z.array(AttendeeSchema).optional().describe('Attendees associated with the reimbursement.'),
        line_items: z.array(LineItemSchema).optional().describe('Line items related to the reimbursement.'),
        receipts: z.array(z.string()).optional().describe('IDs of receipts attached to the reimbursement.'),
        accounting_field_selections: z.array(AccountingFieldSelectionSchema).optional().describe('Accounting fields selected to code the reimbursement.'),
        payment_batch_id: z.string().nullable().optional().describe('Unique identifier of the reimbursement payment batch.'),
        payment_id: z.string().nullable().optional().describe('Unique identifier of the payment, once paid.'),
        trace_id: TraceIdSchema.nullable().optional().describe('Bank-facing accountability reference for the payment, when available.'),
        expense_group: ExpenseGroupSchema.nullable().optional().describe('Expense group the reimbursement belongs to, when available.')
    })
    .describe('A single reimbursement with its state, type, amounts, payee, trip, and accounting details.');

/**
 * @tags: [read]
 * @tagReason: Reads a single reimbursement from the provider without modifying any provider state.
 * @pitfalls: Fetches are served from a read replica, so a reimbursement may briefly return stale values immediately after it is created or updated.
 */
const action = createAction({
    description: 'Retrieve a single reimbursement by ID.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.ramp.com/developer-api/v1/api-reference/reimbursements/get-reimbursement
        const response = await nango.get({
            endpoint: `/developer/v1/reimbursements/${encodeURIComponent(input.reimbursement_id)}`,
            retries: 3
        });

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
