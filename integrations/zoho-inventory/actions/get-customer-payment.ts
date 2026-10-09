import { z } from 'zod';
import { createAction } from 'nango';

import { resolveOrganizationId } from '../helpers/organization.js';

const InputSchema = z
    .object({
        payment_id: z.string().describe('Customer payment ID. Example: "260815000000113012"'),
        organization_id: z
            .string()
            .optional()
            .describe(
                'Zoho Inventory organization ID. If omitted and only one organization exists, it is used automatically. Required when multiple organizations exist.'
            )
    })
    .describe('Identifies the recorded customer payment to retrieve.');

const InvoiceSchema = z.object({
    invoice_id: z.string().optional().describe('ID of the invoice the payment was applied to.'),
    invoice_number: z.string().optional().describe('Number of the invoice the payment was applied to.'),
    invoice_payment_id: z.string().optional().describe('ID of the payment-to-invoice association.'),
    amount_applied: z.number().optional().describe('Amount of this payment applied to the invoice.'),
    tax_amount_withheld: z.number().optional().describe('Tax amount withheld on this invoice allocation.'),
    discount_amount: z.number().optional().describe('Early-payment discount applied on this invoice allocation.'),
    unprocessed_payment_amount: z.number().optional().describe('Portion of the allocation not yet processed by Zoho.'),
    total: z.number().optional().describe('Total amount of the invoice.'),
    balance: z.number().optional().describe('Outstanding balance remaining on the invoice.'),
    date: z.string().optional().describe('Invoice date (YYYY-MM-DD).'),
    due_date: z.string().optional().describe('Invoice due date (YYYY-MM-DD).'),
    apply_date: z.string().optional().describe('Date the payment was applied to the invoice (YYYY-MM-DD).')
});

const CheckDetailsSchema = z.object({
    check_id: z.string().optional().describe('Check ID when the payment mode is check.'),
    check_number: z.string().optional().describe('Check number when the payment mode is check.'),
    check_status: z.string().optional().describe('Status of the check.'),
    memo: z.string().optional().describe('Memo recorded on the check.'),
    expiry_date: z.string().optional().describe('Expiry date of the check (YYYY-MM-DD).'),
    clearance_account_id: z.string().optional().describe('ID of the account used to clear the check.')
});

const ProviderPaymentSchema = z.object({
    payment_id: z.string().optional().describe('Unique ID of the customer payment.'),
    payment_number: z.string().optional().describe('System-generated payment number.'),
    customer_id: z.string().optional().describe('ID of the customer who made the payment.'),
    customer_name: z.string().optional().describe('Name of the customer who made the payment.'),
    payment_mode: z.string().optional().describe('Mode of payment, for example "cash", "check" or "bank_transfer".'),
    date: z.string().optional().describe('Date the payment was recorded (YYYY-MM-DD).'),
    amount: z.number().optional().describe('Payment amount in the organization currency.'),
    bcy_amount: z.number().optional().describe('Payment amount in the organization base currency.'),
    unused_amount: z.number().optional().describe('Portion of the payment not yet applied to any invoice.'),
    bank_charges: z.number().optional().describe('Bank charges associated with the payment.'),
    reference_number: z.string().optional().describe('External reference number for the payment.'),
    description: z.string().optional().describe('Description or note recorded on the payment.'),
    payment_status: z.string().optional().describe('Payment status, for example "paid" or "partially_paid".'),
    account_id: z.string().optional().describe('ID of the deposit account the payment was recorded to.'),
    account_name: z.string().optional().describe('Name of the deposit account the payment was recorded to.'),
    currency_code: z.string().optional().describe('Currency code of the payment (ISO 4217, for example "USD").'),
    currency_symbol: z.string().optional().describe('Currency symbol of the payment (for example "$").'),
    exchange_rate: z.number().optional().describe('Exchange rate used for the payment.'),
    currency_id: z.string().optional().describe('ID of the payment currency.'),
    account_type: z.string().optional().describe('Type of the deposit account, for example "cash" or "bank".'),
    customer_advance_account_id: z.string().optional().describe('ID of the account that holds any unused amount as a customer advance.'),
    customer_advance_account_name: z.string().optional().describe('Name of the account that holds any unused amount as a customer advance.'),
    bank_charges_account_id: z.string().optional().describe('ID of the account bank charges are recorded to.'),
    bank_charges_account_name: z.string().optional().describe('Name of the account bank charges are recorded to.'),
    tax_amount_withheld: z.number().optional().describe('Total tax amount withheld from the payment.'),
    tax_account_id: z.string().optional().describe('ID of the account withheld tax is recorded to.'),
    tax_account_name: z.string().optional().describe('Name of the account withheld tax is recorded to.'),
    discount_amount: z.number().optional().describe('Early-payment discount applied to the payment.'),
    payment_gateway: z.string().optional().describe('Online payment gateway that processed the payment, empty for offline payments.'),
    online_transaction_id: z.string().optional().describe('Gateway transaction ID for online payments.'),
    settlement_status: z.string().optional().describe('Gateway settlement status for online payments.'),
    card_type: z.string().optional().describe('Card type for card payments.'),
    last_four_digits: z.string().optional().describe('Last four digits of the card for card payments.'),
    sales_person_id: z.string().optional().describe('ID of the salesperson associated with the payment.'),
    sales_person_name: z.string().optional().describe('Name of the salesperson associated with the payment.'),
    template_id: z.string().optional().describe('ID of the PDF template used for the payment receipt.'),
    template_name: z.string().optional().describe('Name of the PDF template used for the payment receipt.'),
    created_by: z.string().optional().describe('Name of the user who recorded the payment.'),
    created_time: z.string().optional().describe('Timestamp when the payment was created.'),
    updated_time: z.string().optional().describe('Timestamp when the payment was last updated.'),
    invoices: z.array(InvoiceSchema).optional().describe('Invoices the payment has been applied to.'),
    check_details: CheckDetailsSchema.optional().describe('Check details when the payment mode is check.'),
    payment_refunds: z.array(z.record(z.string(), z.unknown())).optional().describe('Refunds issued against the payment.'),
    documents: z.array(z.record(z.string(), z.unknown())).optional().describe('Documents attached to the payment.'),
    deposit_details: z.array(z.record(z.string(), z.unknown())).optional().describe('Deposit records associated with the payment.'),
    custom_fields: z.array(z.record(z.string(), z.unknown())).optional().describe('Custom field values set on the payment.'),
    tags: z.array(z.record(z.string(), z.unknown())).optional().describe('Tags associated with the payment.')
});

const OutputSchema = ProviderPaymentSchema.describe('Full details of a recorded customer payment.');

/**
 * @tags: [read]
 * @tagReason: Reads a single customer payment by ID (and the organization list when organization_id is omitted). No provider state is modified.
 * @pitfalls: A nonexistent payment ID fails with a thrown 404 error rather than an empty result; omitting organization_id only auto-resolves when the account has exactly one organization, otherwise the action throws.
 */
const action = createAction({
    description: 'Get full details for one recorded customer payment by ID.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInventory.customerpayments.READ', 'ZohoInventory.settings.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const organizationId = await resolveOrganizationId(nango, input.organization_id);

        // https://www.zoho.com/inventory/api/v1/customer-payments/
        const response = await nango.get({
            endpoint: `/inventory/v1/customerpayments/${encodeURIComponent(input.payment_id)}`,
            params: {
                organization_id: organizationId
            },
            retries: 3
        });

        const WrapperSchema = z.object({
            code: z.number(),
            message: z.string(),
            payment: z.unknown().optional()
        });

        const data = WrapperSchema.parse(response.data);

        if (data.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: data.message,
                code: data.code
            });
        }

        if (!data.payment) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Customer payment not found',
                payment_id: input.payment_id
            });
        }

        return ProviderPaymentSchema.parse(data.payment);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
