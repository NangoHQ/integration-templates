import { z } from 'zod';
import { createAction } from 'nango';

const AmountSchema = z
    .object({
        currency: z.string().describe('Currency of the amount in ISO 4217 format. Example: "USD"'),
        value: z.number().describe('Amount in the smallest denomination of the currency (e.g. cents for USD).')
    })
    .passthrough();

const CurrencyAmountSchema = z
    .object({
        amount: z.number().describe('Amount in the smallest denomination of the currency.'),
        currency_code: z.string().describe('Currency code in ISO 4217 format. Example: "USD"'),
        minor_unit_conversion_rate: z.number().nullable().optional().describe('Factor converting minor units to the real currency value (e.g. 100 for USD).')
    })
    .passthrough();

const CardHolderSchema = z
    .object({
        user_id: z.string().nullable().optional().describe('Ramp user ID of the card holder.'),
        first_name: z.string().nullable().optional().describe('First name of the card holder.'),
        last_name: z.string().nullable().optional().describe('Last name of the card holder.'),
        employee_id: z.string().nullable().optional().describe('User-defined employee ID of the card holder.'),
        department_id: z.string().nullable().optional().describe('ID of the department the card holder belongs to.'),
        department_name: z.string().nullable().optional().describe('Name of the department the card holder belongs to.'),
        location_id: z.string().nullable().optional().describe('ID of the location the card holder belongs to.'),
        location_name: z.string().nullable().optional().describe('Name of the location the card holder belongs to.')
    })
    .passthrough();

const MerchantLocationSchema = z
    .object({
        city: z.string().nullable().optional().describe('City where the merchant transaction occurred.'),
        state: z.string().nullable().optional().describe('State or region where the merchant transaction occurred.'),
        country: z.string().nullable().optional().describe('Country code where the merchant transaction occurred.'),
        postal_code: z.string().nullable().optional().describe('Postal code where the merchant transaction occurred.')
    })
    .passthrough();

const LineItemSchema = z
    .object({
        id: z.string().nullable().optional().describe('Ramp ID of the persisted split line item.'),
        memo: z.string().nullable().optional().describe('Memo associated with the line item.'),
        amount: CurrencyAmountSchema.nullable().optional().describe('Line item amount in the transaction settlement currency, in minor units.'),
        converted_amount: CurrencyAmountSchema.nullable().optional().describe('Line item amount converted to the card currency, in minor units.')
    })
    .passthrough();

const AttendeeSchema = z
    .object({
        name: z.string().describe('Full name of the attendee.'),
        user_id: z.string().nullable().optional().describe('Ramp user ID of the attendee when linked to a Ramp user.')
    })
    .passthrough();

const AccountingFieldSelectionSchema = z
    .object({
        id: z.string().nullable().optional().describe('Ramp ID of the selected accounting field option.'),
        name: z.string().nullable().optional().describe('Name of the selected accounting field option.'),
        type: z.string().nullable().optional().describe('Accounting field type. Example: "GL_ACCOUNT"'),
        display_name: z.string().nullable().optional().describe('Ramp-side display name of the accounting field option.'),
        external_id: z.string().nullable().optional().describe('External ID of the option in the connected ERP.'),
        external_code: z.string().nullable().optional().describe('External code of the option in the connected ERP.')
    })
    .passthrough();

const PolicyViolationSchema = z
    .object({
        id: z.string().optional().describe('Unique identifier of the policy violation.'),
        type: z.string().optional().describe('Type of the policy violation.'),
        memo: z.string().nullable().optional().describe('Free-form text describing the policy violation.'),
        created_at: z.string().optional().describe('ISO 8601 time the policy violation was created.')
    })
    .passthrough();

const DisputeSchema = z
    .object({
        id: z.string().optional().describe('Unique identifier of the transaction dispute.'),
        type: z.string().optional().describe('Dispute type.'),
        memo: z.string().nullable().optional().describe('Free-form text describing the dispute.'),
        created_at: z.string().optional().describe('ISO 8601 time the dispute was created.')
    })
    .passthrough();

const TransactionSchema = z
    .object({
        id: z.string().describe('Unique transaction ID.'),
        state: z.string().describe('Transaction state. Example: "CLEARED"'),
        user_transaction_time: z.string().optional().describe('ISO 8601 time the card holder made the transaction.'),
        settlement_date: z.string().nullable().optional().describe('ISO 8601 time funds moved for the transaction.'),
        accounting_date: z.string().nullable().optional().describe('ISO 8601 date used for accounting purposes.'),
        updated_at: z.string().nullable().optional().describe('ISO 8601 timestamp of the last transaction update.'),
        synced_at: z.string().nullable().optional().describe('ISO 8601 time the transaction was synced to accounting, or null.'),
        sync_status: z.string().nullable().optional().describe('Accounting sync status of the transaction.'),
        all_requirements_met_and_approved: z.boolean().optional().describe('Whether all cardholder requirements are met and the transaction is approved.'),
        card_id: z.string().optional().describe('ID of the physical or virtual card used for the transaction.'),
        card_present: z.boolean().optional().describe('Whether the transaction used a card-present terminal.'),
        card_holder: CardHolderSchema.nullable().optional().describe('Information about the card holder who made the transaction.'),
        fund_id: z.string().optional().describe('ID of the fund (spend limit) associated with the transaction.'),
        entity_id: z.string().nullable().optional().describe('ID of the business entity associated with the transaction.'),
        spend_program_id: z.string().nullable().optional().describe('ID of the spend program the transaction belongs to.'),
        trip_id: z.string().nullable().optional().describe('ID of the trip associated with the transaction, if any.'),
        trip_name: z.string().nullable().optional().describe('Name of the trip associated with the transaction, if any.'),
        statement_id: z.string().nullable().optional().describe('ID of the statement associated with the transaction, if any.'),
        memo: z.string().nullable().optional().describe('Memo currently attached to the transaction.'),
        merchant_id: z.string().nullable().optional().describe('ID of the merchant.'),
        merchant_name: z.string().nullable().optional().describe('Name of the merchant. Example: "Air Canada"'),
        merchant_descriptor: z.string().nullable().optional().describe('Descriptor that appears on the card statement.'),
        merchant_category_code: z.string().nullable().optional().describe('Merchant category code (MCC) of the merchant.'),
        merchant_category_code_description: z.string().nullable().optional().describe('Human-readable description of the merchant category code.'),
        merchant_location: MerchantLocationSchema.nullable().optional().describe('Card acceptor location data for the transaction.'),
        sk_category_id: z.number().nullable().optional().describe('Ramp spend category code.'),
        sk_category_name: z.string().nullable().optional().describe('Ramp spend category name. Example: "Airlines"'),
        amount: z.number().nullable().optional().describe('Deprecated. Transaction amount as a decimal number.'),
        currency_code: z.string().nullable().optional().describe('Deprecated. Currency code of the transaction amount.'),
        entity_amount: AmountSchema.nullable().optional().describe('Settled amount in the entity settlement currency, in minor units.'),
        merchant_amount: AmountSchema.nullable().optional().describe('Original merchant-charged amount in the merchant currency, in minor units.'),
        original_transaction_amount: CurrencyAmountSchema.nullable().optional().describe('Original transaction amount before currency conversion.'),
        minor_unit_conversion_rate: z.number().nullable().optional().describe('Factor converting minor units to the real currency value (e.g. 100 for USD).'),
        network_merchant_id: z.string().nullable().optional().describe('Network merchant identifier from the card acceptor.'),
        original_transaction_id: z.string().nullable().optional().describe('Original transaction ID for refund transactions, if any.'),
        receipt_affidavit: z.string().nullable().optional().describe('Receipt affidavit text, if any.'),
        receipts: z.array(z.string()).optional().describe('IDs of receipts attached to the transaction.'),
        line_items: z.array(LineItemSchema).optional().describe('Split line items of the transaction.'),
        attendees: z.array(AttendeeSchema).optional().describe('Attendees associated with the transaction.'),
        accounting_field_selections: z.array(AccountingFieldSelectionSchema).optional().describe('Accounting fields selected to code the transaction.'),
        policy_violations: z.array(PolicyViolationSchema).optional().describe('Policy violations raised for the transaction.'),
        disputes: z.array(DisputeSchema).optional().describe('Disputes raised for the transaction.'),
        merchant_data: z.unknown().optional().describe('Additional purchase data provided by the merchant, when available.')
    })
    .passthrough();

const ReceiptSchema = z
    .object({
        id: z.string().describe('Unique receipt ID.'),
        receipt_url: z.string().describe('Pre-signed URL to download the receipt image. Expires shortly after the call.'),
        transaction_id: z.string().nullable().optional().describe('ID of the transaction the receipt belongs to.'),
        reimbursement_id: z.string().nullable().optional().describe('ID of the reimbursement the receipt belongs to, when applicable.'),
        user_id: z.string().nullable().optional().describe('ID of the user who uploaded the receipt.'),
        created_at: z.string().optional().describe('ISO 8601 time the receipt was created.')
    })
    .passthrough();

const ReceiptListSchema = z.object({
    data: z.array(ReceiptSchema),
    page: z.object({
        next: z.string().nullable()
    })
});

const MemoSchema = z.object({
    id: z.string().optional(),
    memo: z.string().nullable().optional()
});

const RECEIPTS_PAGE_SIZE = 100;

const InputSchema = z
    .object({
        transaction_id: z.string().describe('ID of the transaction to fetch full context for. Example: "1e132a4f-392b-4e12-8f35-2788034a9ead"')
    })
    .describe('Input for fetching a single transaction together with its receipts and memo.');

const OutputSchema = z
    .object({
        transaction: TransactionSchema.describe('The full transaction record, including merchant, amount, card, and card holder details.'),
        receipts: z.array(ReceiptSchema).describe('All receipts attached to the transaction. Empty when the transaction has no receipts.'),
        memo: z.string().nullable().describe('Current memo text for the transaction, or null when no memo is set.')
    })
    .describe('A transaction merged with all of its receipts and its current memo.');

/**
 * @tags: [read]
 * @tagReason: Reads the transaction, its receipts, and its memo from the provider without modifying any provider state.
 * @pitfalls: Transactions without receipts return an empty receipts array and transactions without a memo return a null memo instead of erroring; receipt_url links are pre-signed and expire about an hour after the call, and monetary values are integers in the smallest currency unit (e.g. cents).
 */
const action = createAction({
    description: 'Composite: a transaction merged with its receipts and current memo in one call.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['transactions:read', 'receipts:read', 'memos:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const transactionResponse = await nango.get({
            // https://docs.ramp.com/developer-api/v1/overview/introduction - GET /developer/v1/transactions/{transaction_id}
            endpoint: `/developer/v1/transactions/${encodeURIComponent(input.transaction_id)}`,
            retries: 3
        });

        const transaction = TransactionSchema.parse(transactionResponse.data);

        const receipts: z.infer<typeof ReceiptSchema>[] = [];
        let start: string | undefined;
        do {
            const receiptsResponse = await nango.get({
                // https://docs.ramp.com/developer-api/v1/overview/introduction - GET /developer/v1/receipts
                endpoint: '/developer/v1/receipts',
                params: {
                    transaction_id: input.transaction_id,
                    page_size: RECEIPTS_PAGE_SIZE,
                    ...(start !== undefined && { start })
                },
                retries: 3
            });

            const page = ReceiptListSchema.parse(receiptsResponse.data);
            receipts.push(...page.data);

            const nextStart = page.page.next != null ? new URL(page.page.next).searchParams.get('start') : null;
            start = nextStart != null && nextStart.length > 0 && nextStart !== start ? nextStart : undefined;
        } while (start !== undefined);

        const memoResponse = await nango.get({
            // https://docs.ramp.com/developer-api/v1/overview/introduction - GET /developer/v1/memos/{transaction_id}
            endpoint: `/developer/v1/memos/${encodeURIComponent(input.transaction_id)}`,
            retries: 3
        });

        const memo = MemoSchema.parse(memoResponse.data);

        return {
            transaction,
            receipts,
            memo: memo.memo ?? null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
