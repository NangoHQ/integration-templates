import { z } from 'zod';
import { createAction, type ProxyConfiguration } from 'nango';

const SignedAmountSchema = z.object({
    currency: z.string().describe('Currency code of the amount, in ISO 4217 format (e.g. "USD").'),
    value: z.number().describe('Amount in the smallest denomination of the currency (e.g. cents for USD).')
});

const CurrencyAmountSchema = z.object({
    amount: z.number().describe('Amount in the smallest denomination of the currency (e.g. cents for USD).'),
    currency_code: z.string().describe('Currency code, in ISO 4217 format (e.g. "USD").'),
    minor_unit_conversion_rate: z.number().nullable().optional().describe('Factor to divide amount by to obtain the major-unit value (100 for USD).')
});

const CardHolderSchema = z.object({
    user_id: z.string().nullable().optional().describe('ID of the card holder user.'),
    first_name: z.string().nullable().optional().describe('Card holder first name.'),
    last_name: z.string().nullable().optional().describe('Card holder last name.'),
    employee_id: z.string().nullable().optional().describe('User-defined employee ID of the card holder.'),
    department_id: z.string().nullable().optional().describe('ID of the card holder department.'),
    department_name: z.string().nullable().optional().describe('Name of the card holder department.'),
    location_id: z.string().nullable().optional().describe('ID of the card holder location.'),
    location_name: z.string().nullable().optional().describe('Name of the card holder location.')
});

const MerchantLocationSchema = z.object({
    city: z.string().nullable().optional().describe('City of the merchant location.'),
    country: z.string().nullable().optional().describe('Country of the merchant location.'),
    state: z.string().nullable().optional().describe('State or region of the merchant location.'),
    postal_code: z.string().nullable().optional().describe('Postal code of the merchant location.')
});

const AttendeeSchema = z.object({
    name: z.string().nullable().optional().describe('Full name of the attendee.'),
    user_id: z.string().nullable().optional().describe('ID of the attendee Ramp user, when linked to one.')
});

const AccountingFieldSelectionSchema = z.object({
    id: z.string().nullable().optional().describe('ID that uniquely identifies the accounting field option within Ramp.'),
    name: z.string().nullable().optional().describe('Name of the accounting field option from the ERP source.'),
    display_name: z.string().nullable().optional().describe('Customer-set display name for the accounting field option, when overridden in Ramp.'),
    external_id: z.string().nullable().optional().describe('External ID of the accounting field option on the ERP.'),
    external_code: z.string().nullable().optional().describe('External code of the accounting field option on the ERP.'),
    provider_name: z.string().nullable().optional().describe('Name of the accounting provider this field option comes from.'),
    type: z.string().nullable().optional().describe('Accounting field type (e.g. "GL_ACCOUNT", "SUBSIDIARY").'),
    category_info: z
        .object({
            id: z.string().nullable().optional().describe('ID of the accounting field within Ramp.'),
            name: z.string().nullable().optional().describe('Name of the accounting field.'),
            external_id: z.string().nullable().optional().describe('External ID of the accounting field on the ERP.'),
            type: z.string().nullable().optional().describe('Accounting field type (e.g. "GL_ACCOUNT", "SUBSIDIARY").')
        })
        .nullable()
        .optional()
        .describe('Information about the accounting field (category) the option belongs to.')
});

const LineItemSchema = z.object({
    id: z.string().nullable().optional().describe('Stable Ramp identifier for a persisted split line.'),
    amount: CurrencyAmountSchema.nullable().optional().describe('Amount of the line item in the transaction settlement currency.'),
    converted_amount: CurrencyAmountSchema.nullable().optional().describe('Amount of the split line converted to the card currency.'),
    memo: z.string().nullable().optional().describe('Memo associated with the line item.'),
    accounting_field_selections: z.array(AccountingFieldSelectionSchema).nullable().optional().describe('Accounting fields coded on the line item.')
});

const MerchantDataSchema = z
    .object({
        reference: z.string().nullable().optional().describe('Purchase data reference ID provided by the merchant.'),
        receipt: z.unknown().nullable().optional().describe('Merchant-provided receipt line data, when available.'),
        flight: z.unknown().nullable().optional().describe('Merchant-provided flight purchase data, when available.'),
        lodging: z.unknown().nullable().optional().describe('Merchant-provided lodging purchase data, when available.'),
        auto_rental: z.unknown().nullable().optional().describe('Merchant-provided auto rental purchase data, when available.')
    })
    .passthrough();

const DeclineDetailsSchema = z.object({
    reason: z.string().nullable().optional().describe('Reason code explaining why the transaction was declined.'),
    amount: z.number().nullable().optional().describe('Declined amount, in the transaction settlement currency.'),
    declined_amount: SignedAmountSchema.nullable().optional().describe('Declined amount with its currency.')
});

const DisputeSchema = z.object({
    id: z.string().nullable().optional().describe('Unique identifier of the transaction dispute.'),
    created_at: z.string().nullable().optional().describe('Time the dispute was created, in ISO-8601 format.'),
    memo: z.string().nullable().optional().describe('Free-form text regarding the dispute.'),
    type: z.string().nullable().optional().describe('Dispute type, e.g. "RESOLVED_BY_RAMP" or "CREATED_UNRECOGNIZED_CHARGE".')
});

const PolicyViolationSchema = z.object({
    id: z.string().nullable().optional().describe('Unique identifier of the policy violation.'),
    created_at: z.string().nullable().optional().describe('Time the policy violation was created, in ISO-8601 format.'),
    memo: z.string().nullable().optional().describe('Free-form text regarding the policy violation.'),
    type: z.string().nullable().optional().describe('Type of the policy violation.')
});

const TransactionSchema = z.object({
    id: z.string().describe('Unique transaction ID.'),
    amount: z.number().nullable().optional().describe('Deprecated; use entity_amount. Transaction amount.'),
    currency_code: z.string().nullable().optional().describe('Deprecated; use entity_amount.currency. Transaction currency code.'),
    entity_amount: SignedAmountSchema.nullable().optional().describe('Amount settled to the business entity, in the entity settlement currency.'),
    merchant_amount: SignedAmountSchema.nullable().optional().describe('Original amount charged by the merchant, in the merchant currency.'),
    original_transaction_amount: CurrencyAmountSchema.nullable().optional().describe('Original transaction amount before any currency conversion.'),
    minor_unit_conversion_rate: z.number().nullable().optional().describe('Factor to divide integer amounts by to obtain major-unit values.'),
    state: z.string().nullable().optional().describe('Transaction state, e.g. "CLEARED", "PENDING", "DECLINED".'),
    sync_status: z.string().nullable().optional().describe('Accounting sync status: "NOT_SYNC_READY", "SYNC_READY" or "SYNCED".'),
    accounting_date: z.string().nullable().optional().describe('Date used for accounting purposes, in ISO-8601 format.'),
    settlement_date: z.string().nullable().optional().describe('Time funds were moved for the transaction, in ISO-8601 format.'),
    user_transaction_time: z.string().nullable().optional().describe('Time the cardholder made the purchase, in ISO-8601 format.'),
    updated_at: z.string().nullable().optional().describe('Approximate last-updated timestamp, in ISO-8601 format.'),
    synced_at: z.string().nullable().optional().describe('Time the transaction was synced to the accounting provider, or null.'),
    card_id: z.string().nullable().optional().describe('ID of the physical or virtual card used for the transaction.'),
    card_present: z.boolean().nullable().optional().describe('Whether the transaction was made with the card present at a terminal.'),
    card_holder: CardHolderSchema.nullable().optional().describe('Information about the card holder.'),
    entity_id: z.string().nullable().optional().describe('ID of the business entity associated with the transaction.'),
    fund_id: z.string().nullable().optional().describe('ID of the fund associated with the transaction.'),
    limit_id: z.string().nullable().optional().describe('Deprecated alias of fund_id.'),
    spend_program_id: z.string().nullable().optional().describe('ID of the spend program the card fund was issued from.'),
    statement_id: z.string().nullable().optional().describe('ID of the statement associated with the transaction, when available.'),
    trip_id: z.string().nullable().optional().describe('ID of the trip associated with the transaction, when available.'),
    trip_name: z.string().nullable().optional().describe('Name of the trip associated with the transaction, when available.'),
    merchant_id: z.string().nullable().optional().describe('ID of the merchant.'),
    merchant_name: z.string().nullable().optional().describe('Display name of the merchant.'),
    merchant_descriptor: z.string().nullable().optional().describe('Merchant descriptor that appears on the card statement.'),
    merchant_location: MerchantLocationSchema.nullable().optional().describe('Card acceptor location details, when available.'),
    merchant_category_code: z.string().nullable().optional().describe('Merchant category code (MCC) classifying the merchant.'),
    merchant_category_code_description: z.string().nullable().optional().describe('Description of the merchant category code.'),
    network_merchant_id: z.string().nullable().optional().describe('Network merchant identifier from the card acceptor.'),
    sk_category_id: z.number().nullable().optional().describe('Ramp spend category code for the transaction.'),
    sk_category_name: z.string().nullable().optional().describe('Ramp spend category name for the transaction.'),
    memo: z.string().nullable().optional().describe('Cardholder memo attached to the transaction.'),
    all_requirements_met_and_approved: z
        .boolean()
        .nullable()
        .optional()
        .describe('Whether the transaction is fully approved with all cardholder requirements met.'),
    requires_accounting_vendor_creation_to_sync: z
        .boolean()
        .nullable()
        .optional()
        .describe('Whether an accounting vendor must be created and coded before this transaction can sync.'),
    accounting_categories: z.array(AccountingFieldSelectionSchema).nullable().optional().describe('Deprecated; use accounting_field_selections.'),
    accounting_field_selections: z.array(AccountingFieldSelectionSchema).nullable().optional().describe('Accounting fields selected to code the transaction.'),
    attendees: z.array(AttendeeSchema).nullable().optional().describe('Attendees associated with the transaction.'),
    line_items: z.array(LineItemSchema).nullable().optional().describe('Split line items related to the transaction.'),
    receipts: z.array(z.string()).nullable().optional().describe('IDs of receipts attached to the transaction.'),
    disputes: z.array(DisputeSchema).nullable().optional().describe('Disputes raised on the transaction.'),
    policy_violations: z.array(PolicyViolationSchema).nullable().optional().describe('Policy violations recorded on the transaction.'),
    decline_details: DeclineDetailsSchema.nullable().optional().describe('Details about the transaction decline, when declined.'),
    merchant_data: MerchantDataSchema.nullable().optional().describe('Purchase data provided by the merchant, when requested and available.'),
    original_transaction_id: z.string().nullable().optional().describe('ID of the original transaction for refunds.'),
    posting_gl_account: z.unknown().nullable().optional().describe('General ledger account the transaction is posted to, when available.')
});

const ProviderResponseSchema = z.object({
    data: z.array(TransactionSchema),
    page: z.object({
        next: z.string().nullable().optional()
    })
});

const InputSchema = z
    .object({
        cursor: z
            .string()
            .min(1)
            .optional()
            .describe('Opaque pagination cursor. Pass the next_cursor value from a previous response to fetch the following page; omit for the first page.'),
        page_size: z.number().int().min(2).max(100).optional().describe('Number of transactions to return per page (2-100). Defaults to 20.'),
        from_date: z
            .string()
            .optional()
            .describe(
                'Only return transactions with a user_transaction_time on or after this ISO-8601 datetime (e.g. "2026-10-14T00:00:00Z"). A bare date is rejected by the API.'
            ),
        to_date: z
            .string()
            .optional()
            .describe(
                'Only return transactions with a user_transaction_time on or before this ISO-8601 datetime (e.g. "2026-10-14T00:00:00Z"). A bare date is rejected by the API.'
            ),
        card_id: z.string().optional().describe('Filter by card ID.'),
        user_id: z.string().optional().describe('Filter by the card holder user ID.'),
        department_id: z.string().optional().describe('Filter by department ID.'),
        merchant_id: z.string().optional().describe('Filter by merchant ID.'),
        state: z
            .enum(['ALL', 'CLEARED', 'COMPLETION', 'DECLINED', 'ERROR', 'PENDING', 'PENDING_INITIATION'])
            .optional()
            .describe('Filter by transaction state. Use "ALL" to include declined transactions.'),
        approval_status: z
            .enum([
                'AWAITING_EMPLOYEE',
                'AWAITING_EMPLOYEE_CHANGES_REQUESTED',
                'AWAITING_EMPLOYEE_MISSING_ITEMS',
                'AWAITING_EMPLOYEE_REPAYMENT_FAILED',
                'AWAITING_EMPLOYEE_REPAYMENT_REQUESTED',
                'AWAITING_REVIEWER',
                'FULLY_APPROVED'
            ])
            .optional()
            .describe('Filter by transaction approval status.'),
        sync_status: z.enum(['NOT_SYNC_READY', 'SYNCED', 'SYNC_READY']).optional().describe('Filter by accounting sync status.'),
        min_amount: z.union([z.string(), z.number()]).optional().describe('Only return transactions with an amount greater than or equal to this USD amount.'),
        max_amount: z.union([z.string(), z.number()]).optional().describe('Only return transactions with an amount less than or equal to this USD amount.'),
        statement_id: z.string().optional().describe('Filter by statement ID.'),
        trip_id: z.string().optional().describe('Filter by trip ID.'),
        entity_id: z.string().optional().describe('Filter by business entity ID.'),
        limit_id: z.string().optional().describe('Filter by fund (limit) ID.'),
        location_id: z.string().optional().describe('Filter by location ID.'),
        spend_program_id: z.string().optional().describe('Filter by spend program ID.'),
        sk_category_id: z.number().int().optional().describe('Filter by Ramp spend category code.'),
        awaiting_approval_by_user_id: z.string().optional().describe('Only return transactions awaiting approval by this user ID.'),
        accounting_field_selection_id: z.string().optional().describe('Filter by an accounting field selection ID.'),
        has_been_approved: z.boolean().optional().describe('When set, only return transactions that are (true) or are not (false) approved.'),
        all_requirements_met_and_approved: z
            .boolean()
            .optional()
            .describe('When set, only return transactions that are (true) or are not (false) fully approved with all requirements met.'),
        has_statement: z.boolean().optional().describe('When set, only return transactions that do (true) or do not (false) have a statement.'),
        has_no_sync_commits: z.boolean().optional().describe('When true, only return transactions not yet synced to an ERP system.'),
        requires_memo: z.boolean().optional().describe('When true, only return transactions that require a memo but do not have one.'),
        include_merchant_data: z.boolean().optional().describe('When true, include all purchase data provided by the merchant.'),
        synced_after: z.string().optional().describe('Only return transactions synced after this ISO-8601 datetime.'),
        order_by_date_asc: z.boolean().optional().describe('When true, sort transactions by user transaction date ascending.'),
        order_by_date_desc: z.boolean().optional().describe('When true, sort transactions by user transaction date descending.'),
        order_by_amount_asc: z.boolean().optional().describe('When true, sort transactions by amount ascending.'),
        order_by_amount_desc: z.boolean().optional().describe('When true, sort transactions by amount descending.')
    })
    .describe('Filters and pagination options for listing card transactions.');

const OutputSchema = z
    .object({
        transactions: z.array(TransactionSchema).describe('Transactions matching the supplied filters.'),
        next_cursor: z.string().optional().describe('Cursor to pass as the cursor input to fetch the next page; omitted when there are no more pages.')
    })
    .describe('A page of card transactions plus the cursor for the next page.');

/**
 * @tags: [read]
 * @tagReason: Lists card transactions via a read-only GET and does not modify any provider data.
 * @pitfalls: from_date/to_date filter on user_transaction_time, not updated_at, so they will not resurface a transaction whose memo or approval status changed later, and both require a full ISO-8601 datetime (a bare date is rejected); declined transactions are excluded unless state is "ALL"; amount is in major units while entity_amount.value and merchant_amount.value are in minor units.
 */
const action = createAction({
    description: 'List card transactions, with extensive filtering and cursor pagination.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['transactions:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params = {
            ...(input.cursor !== undefined && { start: input.cursor }),
            ...(input.page_size !== undefined && { page_size: input.page_size }),
            ...(input.from_date !== undefined && { from_date: input.from_date }),
            ...(input.to_date !== undefined && { to_date: input.to_date }),
            ...(input.card_id !== undefined && { card_id: input.card_id }),
            ...(input.user_id !== undefined && { user_id: input.user_id }),
            ...(input.department_id !== undefined && { department_id: input.department_id }),
            ...(input.merchant_id !== undefined && { merchant_id: input.merchant_id }),
            ...(input.state !== undefined && { state: input.state }),
            ...(input.approval_status !== undefined && { approval_status: input.approval_status }),
            ...(input.sync_status !== undefined && { sync_status: input.sync_status }),
            ...(input.min_amount !== undefined && { min_amount: input.min_amount }),
            ...(input.max_amount !== undefined && { max_amount: input.max_amount }),
            ...(input.statement_id !== undefined && { statement_id: input.statement_id }),
            ...(input.trip_id !== undefined && { trip_id: input.trip_id }),
            ...(input.entity_id !== undefined && { entity_id: input.entity_id }),
            ...(input.limit_id !== undefined && { limit_id: input.limit_id }),
            ...(input.location_id !== undefined && { location_id: input.location_id }),
            ...(input.spend_program_id !== undefined && { spend_program_id: input.spend_program_id }),
            ...(input.sk_category_id !== undefined && { sk_category_id: input.sk_category_id }),
            ...(input.awaiting_approval_by_user_id !== undefined && { awaiting_approval_by_user_id: input.awaiting_approval_by_user_id }),
            ...(input.accounting_field_selection_id !== undefined && { accounting_field_selection_id: input.accounting_field_selection_id }),
            ...(input.has_been_approved !== undefined && { has_been_approved: String(input.has_been_approved) }),
            ...(input.all_requirements_met_and_approved !== undefined && {
                all_requirements_met_and_approved: String(input.all_requirements_met_and_approved)
            }),
            ...(input.has_statement !== undefined && { has_statement: String(input.has_statement) }),
            ...(input.has_no_sync_commits !== undefined && { has_no_sync_commits: String(input.has_no_sync_commits) }),
            ...(input.requires_memo !== undefined && { requires_memo: String(input.requires_memo) }),
            ...(input.include_merchant_data !== undefined && { include_merchant_data: String(input.include_merchant_data) }),
            ...(input.synced_after !== undefined && { synced_after: input.synced_after }),
            ...(input.order_by_date_asc !== undefined && { order_by_date_asc: String(input.order_by_date_asc) }),
            ...(input.order_by_date_desc !== undefined && { order_by_date_desc: String(input.order_by_date_desc) }),
            ...(input.order_by_amount_asc !== undefined && { order_by_amount_asc: String(input.order_by_amount_asc) }),
            ...(input.order_by_amount_desc !== undefined && { order_by_amount_desc: String(input.order_by_amount_desc) })
        };

        const config: ProxyConfiguration = {
            // https://docs.ramp.com/developer-api/v1/overview/introduction
            endpoint: '/developer/v1/transactions',
            params,
            retries: 3
        };

        const response = await nango.get(config);
        const parsed = ProviderResponseSchema.parse(response.data);

        const nextUrl = parsed.page.next;
        const nextCursor = nextUrl != null ? new URL(nextUrl).searchParams.get('start') : null;

        return {
            transactions: parsed.data,
            ...(nextCursor != null && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
