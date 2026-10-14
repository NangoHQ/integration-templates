import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        transaction_id: z.string().describe('Unique identifier of the transaction to retrieve. Example: "1e132a4f-392b-4e12-8f35-2788034a9ead"')
    })
    .describe('Input for retrieving a single transaction by its ID.');

const SignedAmountSchema = z.object({
    currency: z.string().describe('Currency of the amount in ISO 4217 format. Example: "USD"'),
    value: z.number().describe('Amount in the smallest denomination of the currency (e.g. cents for USD); may be negative for refunds or credits.')
});

const CurrencyAmountSchema = z.object({
    amount: z.number().describe('Amount in the smallest denomination of the currency (e.g. cents for USD).'),
    currency_code: z.string().describe('Currency of the amount in ISO 4217 format. Example: "USD"'),
    minor_unit_conversion_rate: z.number().nullable().optional().describe('Conversion factor from the integer amount to the real currency value (100 for USD).')
});

const CardHolderSchema = z.object({
    user_id: z.string().optional().describe('Identifier of the card holder user.'),
    first_name: z.string().optional().describe('Card holder first name.'),
    last_name: z.string().optional().describe('Card holder last name.'),
    employee_id: z.string().nullable().optional().describe('User-defined employee identifier of the card holder.'),
    department_id: z.string().optional().describe('Identifier of the card holder department.'),
    department_name: z.string().optional().describe('Name of the card holder department.'),
    location_id: z.string().optional().describe('Identifier of the card holder location.'),
    location_name: z.string().optional().describe('Name of the card holder location.')
});

const MerchantLocationSchema = z.object({
    city: z.string().nullable().describe('Card acceptor city.'),
    country: z.string().nullable().describe('Card acceptor country.'),
    state: z.string().nullable().describe('Card acceptor state or region.'),
    postal_code: z.string().nullable().describe('Card acceptor postal code.')
});

const AccountingCategoryInfoSchema = z.object({
    id: z.string().optional().describe('Identifier of the accounting field within Ramp.'),
    name: z.string().optional().describe('Name of the accounting field.'),
    external_id: z.string().optional().describe('External identifier of the accounting field on the ERP.'),
    type: z.string().optional().describe('Accounting field type. Example: "GL_ACCOUNT"')
});

const AccountingFieldSelectionSchema = z.object({
    id: z.string().optional().describe('Identifier that uniquely identifies the accounting field option within Ramp.'),
    name: z.string().optional().describe('Name of the accounting field option.'),
    external_id: z.string().optional().describe('External identifier of the accounting field option on the ERP.'),
    external_code: z.string().optional().describe('External code of the accounting field option displayed on the ERP.'),
    display_name: z.string().nullable().optional().describe('Customer-set display name for the accounting field option in Ramp.'),
    provider_name: z.string().optional().describe('Name of the accounting field provider.'),
    type: z.string().optional().describe('Accounting field type. Example: "SUBSIDIARY"'),
    source: z
        .object({
            type: z.string().optional().describe('Type of source that added this accounting field selection.')
        })
        .optional()
        .describe('Source of the accounting coding selection.'),
    category_info: AccountingCategoryInfoSchema.optional().describe('Information about the accounting category or accounting field.')
});

const AccountingCategorySchema = z.object({
    category_id: z.string().optional().describe('User-selected category identifier for the transaction.'),
    category_name: z.string().optional().describe('User-selected category name for the transaction.'),
    tracking_category_remote_id: z.string().optional().describe('Remote identifier of the tracking category.'),
    tracking_category_remote_name: z.string().optional().describe('Remote name of the tracking category.'),
    tracking_category_remote_type: z.string().optional().describe('Remote type of the tracking category.')
});

const LineItemSchema = z.object({
    id: z.string().nullable().optional().describe('Stable Ramp identifier for a persisted split line; null for generated lines.'),
    amount: CurrencyAmountSchema.nullable().optional().describe('Amount of the line item in the currency the transaction settled in.'),
    converted_amount: CurrencyAmountSchema.nullable().optional().describe('Amount of the split line item converted to the card currency.'),
    memo: z.string().optional().describe('Memo associated with the line item.'),
    accounting_field_selections: z.array(AccountingFieldSelectionSchema).optional().describe('Accounting field options selected to code the line item.')
});

const AttendeeSchema = z.object({
    name: z.string().describe('Full name of the attendee.'),
    user_id: z.string().nullable().describe('Identifier of the attendee user; null when the attendee is not a Ramp user.')
});

const DisputeSchema = z.object({
    id: z.string().describe('Unique identifier of the transaction dispute.'),
    type: z.string().optional().describe('Dispute type. Example: "CREATED_MERCHANT_ERROR"'),
    memo: z.string().optional().describe('Free-form text regarding the dispute.'),
    created_at: z.string().optional().describe('Time the dispute was created, in ISO 8601 format.')
});

const PolicyViolationSchema = z.object({
    id: z.string().describe('Unique identifier of the policy violation.'),
    type: z.string().optional().describe('Type of the policy violation.'),
    memo: z.string().optional().describe('Free-form text regarding the policy violation.'),
    created_at: z.string().optional().describe('Time the policy violation was created, in ISO 8601 format.')
});

const DeclineDetailsSchema = z.object({
    amount: z.number().nullable().optional().describe('Deprecated. Declined amount in the transaction settlement currency.'),
    declined_amount: SignedAmountSchema.nullable().optional().describe('Declined amount with its currency, in minor units.'),
    reason: z.string().optional().describe('Reason the transaction was declined. Example: "AUTHORIZER_CARD_LIMIT"')
});

const OutputSchema = z
    .object({
        id: z.string().describe('Unique identifier of the transaction.'),
        amount: z.number().nullable().optional().describe('Deprecated. Use entity_amount. Amount in the transaction currency.'),
        currency_code: z.string().nullable().optional().describe('Deprecated. Use entity_amount.currency. ISO 4217 currency code.'),
        entity_amount: SignedAmountSchema.nullable().optional().describe('Amount settled to the entity in its settlement currency, in minor units.'),
        merchant_amount: SignedAmountSchema.nullable().optional().describe('Original amount charged by the merchant, in minor units.'),
        original_transaction_amount: CurrencyAmountSchema.nullable().optional().describe('Original transaction amount before currency conversion.'),
        minor_unit_conversion_rate: z.number().nullable().optional().describe('Conversion factor from minor units to the real currency value (100 for USD).'),
        user_transaction_time: z.string().optional().describe('Time the transaction was created by the user, in ISO 8601 format.'),
        updated_at: z.string().nullable().optional().describe('Approximate last-updated timestamp used by the updated_after filter, in ISO 8601 format.'),
        settlement_date: z.string().optional().describe('Time funds were moved for the transaction, in ISO 8601 format.'),
        accounting_date: z.string().nullable().optional().describe('Date used for accounting purposes, in ISO 8601 format.'),
        state: z.string().optional().describe('Transaction state: ALL, CLEARED, COMPLETION, DECLINED, ERROR, PENDING, or PENDING_INITIATION.'),
        sync_status: z.string().optional().describe('Accounting sync status: NOT_SYNC_READY, SYNCED, or SYNC_READY.'),
        synced_at: z.string().nullable().optional().describe('Time the transaction was synced, in ISO 8601 format; null if not synced.'),
        card_id: z.string().optional().describe('Identifier of the card associated with the transaction.'),
        card_holder: CardHolderSchema.optional().describe('Information about the card holder.'),
        card_present: z.boolean().optional().describe('Whether the transaction was processed using a card present terminal.'),
        fund_id: z.string().optional().describe('Identifier of the fund (spending limit) associated with the transaction.'),
        limit_id: z.string().nullable().optional().describe('Deprecated alias of fund_id.'),
        entity_id: z.string().nullable().optional().describe('Identifier of the business entity associated with the transaction.'),
        merchant_id: z.string().nullable().optional().describe('Identifier of the merchant.'),
        merchant_name: z.string().nullable().optional().describe('Name of the merchant.'),
        merchant_descriptor: z.string().nullable().optional().describe('Merchant descriptor shown on card statements.'),
        merchant_category_code: z.string().nullable().optional().describe('Four-digit merchant category code (ISO 18245).'),
        merchant_category_code_description: z.string().nullable().optional().describe('Description of the merchant category code.'),
        merchant_location: MerchantLocationSchema.nullable().optional().describe('Card acceptor location data (city, country, state, postal code).'),
        network_merchant_id: z.string().nullable().optional().describe('Network merchant identifier from the card acceptor.'),
        sk_category_id: z.number().nullable().optional().describe('Ramp category code.'),
        sk_category_name: z.string().nullable().optional().describe('Ramp category name. Example: "Airlines"'),
        trip_id: z.string().nullable().optional().describe('Identifier of the trip associated with the transaction, if any.'),
        trip_name: z.string().nullable().optional().describe('Name of the trip associated with the transaction, if any.'),
        statement_id: z.string().nullable().optional().describe('Identifier of the statement associated with the transaction, if any.'),
        memo: z.string().nullable().optional().describe('Free-form memo attached to the transaction.'),
        receipts: z.array(z.string()).optional().describe('Identifiers of receipts attached to the transaction, in ascending creation order.'),
        receipt_affidavit: z.string().nullable().optional().describe('Receipt affidavit text, if any.'),
        line_items: z.array(LineItemSchema).optional().describe('Line items related to the transaction.'),
        accounting_categories: z.array(AccountingCategorySchema).optional().describe('Deprecated. Use accounting_field_selections instead.'),
        accounting_field_selections: z.array(AccountingFieldSelectionSchema).optional().describe('Accounting fields selected to code the transaction.'),
        disputes: z.array(DisputeSchema).optional().describe('Disputes filed for the transaction, newest first.'),
        policy_violations: z.array(PolicyViolationSchema).optional().describe('Policy violations for the transaction, newest first.'),
        attendees: z.array(AttendeeSchema).optional().describe('Attendees associated with the transaction, if any.'),
        all_requirements_met_and_approved: z
            .boolean()
            .optional()
            .describe('Whether the transaction is fully approved and all cardholder requirements are met.'),
        spend_program_id: z.string().nullable().optional().describe('Identifier of the spend program that issued the transaction card, if any.'),
        posting_gl_account: z.string().nullable().optional().describe('Posting general ledger account, if available.'),
        decline_details: DeclineDetailsSchema.optional().describe('Details about a transaction decline, if any.'),
        requires_accounting_vendor_creation_to_sync: z
            .boolean()
            .optional()
            .describe('Whether an accounting vendor must be created before the transaction can sync.')
    })
    .describe('A single Ramp transaction, including amounts, merchant, card holder, accounting coding, receipts, disputes, and policy violations.');

/**
 * @tags: [read]
 * @tagReason: Retrieves a single transaction from the provider without modifying any provider state.
 * @pitfalls: An unknown transaction_id fails the action with a provider 404 instead of an empty result. Monetary values are integer minor units (e.g. cents), merchant_amount is in the merchant's currency while entity_amount is in the settlement currency and both may be negative for refunds or credits, amount and currency_code are deprecated aliases, receipts contains receipt IDs only, and memo plus several merchant and trip fields can be null.
 */
const action = createAction({
    description: 'Retrieve a single transaction by its ID.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['transactions:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.ramp.com/openapi/developer-api.json (GET /developer/v1/transactions/{transaction_id})
            endpoint: `/developer/v1/transactions/${encodeURIComponent(input.transaction_id)}`,
            retries: 3
        });

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
