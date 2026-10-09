import { z } from 'zod';
import { createAction } from 'nango';

const PaymentModeSchema = z
    .string()
    .describe('Mode through which the payment was made. Allowed values: check, cash, creditcard, banktransfer, bankremittance, autotransaction, others.');

const InvoiceInputSchema = z.object({
    invoice_id: z.string().describe('ID of the invoice the payment is applied to. Example: "260815000000103001".'),
    amount_applied: z.number().describe('Amount of this payment applied to the invoice.'),
    tax_amount_withheld: z.number().optional().describe('Tax amount withheld on the invoice payment.'),
    exchange_rate: z.number().optional().describe('Exchange rate used for this invoice application.')
});

const CustomFieldInputSchema = z.object({
    label: z.string().describe('Label of the custom field.'),
    value: z.string().describe('Value of the custom field.')
});

const InputSchema = z
    .object({
        payment_id: z.string().describe('ID of the customer payment to update. Example: "260815000000113012".'),
        organization_id: z.string().describe('Zoho organization ID that owns the payment. Required by every Zoho Invoice endpoint. Example: "927270289".'),
        customer_id: z.string().optional().describe("ID of the customer the payment belongs to. Defaults to the payment's current customer."),
        payment_mode: PaymentModeSchema.optional(),
        amount: z.number().optional().describe('Total amount of the payment. Defaults to the current amount.'),
        date: z.string().optional().describe('Date the payment was made in yyyy-mm-dd format. Defaults to the current date on the payment.'),
        reference_number: z.string().optional().describe('Reference number for the payment, e.g. a bank reference.'),
        description: z.string().optional().describe('Free-text description of the payment.'),
        invoices: z.array(InvoiceInputSchema).optional().describe('Invoices the payment is applied to. Supply this to change how the payment is allocated.'),
        exchange_rate: z.number().optional().describe('Exchange rate for the payment currency.'),
        bank_charges: z.number().optional().describe('Additional bank charges associated with the payment.'),
        custom_fields: z.array(CustomFieldInputSchema).optional().describe('Additional custom fields to set on the payment.')
    })
    .describe('Input for updating an existing Zoho Invoice customer payment.');

const ProviderInvoiceSchema = z.object({
    invoice_id: z.string(),
    invoice_number: z.string().optional().nullable(),
    amount_applied: z.number().optional().nullable(),
    balance: z.number().optional().nullable()
});

const ProviderPaymentSchema = z.object({
    payment_id: z.string(),
    payment_number: z.string().optional().nullable(),
    customer_id: z.string().optional().nullable(),
    customer_name: z.string().optional().nullable(),
    payment_mode: z.string().optional().nullable(),
    amount: z.number().optional().nullable(),
    date: z.string().optional().nullable(),
    reference_number: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    payment_status: z.string().optional().nullable(),
    unused_amount: z.number().optional().nullable(),
    updated_time: z.string().optional().nullable(),
    invoices: z.array(ProviderInvoiceSchema).optional().nullable()
});

const GetPaymentResponseSchema = z.object({
    payment: ProviderPaymentSchema
});

const UpdatePaymentResponseSchema = z.object({
    code: z.number(),
    message: z.string().optional(),
    payment: ProviderPaymentSchema.optional()
});

const OutputSchema = z
    .object({
        payment_id: z.string().describe('ID of the updated customer payment.'),
        payment_number: z.string().optional().describe('Display number of the payment.'),
        customer_id: z.string().describe('ID of the customer the payment belongs to.'),
        customer_name: z.string().optional().describe('Name of the customer the payment belongs to.'),
        payment_mode: z.string().describe('Mode through which the payment was made.'),
        amount: z.number().describe('Total amount of the payment.'),
        date: z.string().describe('Date the payment was made in yyyy-mm-dd format.'),
        reference_number: z.string().optional().describe('Reference number for the payment.'),
        description: z.string().optional().describe('Free-text description of the payment.'),
        payment_status: z.string().optional().describe('Current status of the payment.'),
        unused_amount: z.number().optional().describe('Amount of the payment not yet applied to any invoice.'),
        updated_time: z.string().optional().describe('Timestamp of the last modification, as returned by Zoho.'),
        invoices: z
            .array(
                z.object({
                    invoice_id: z.string().describe('ID of the invoice the payment is applied to.'),
                    invoice_number: z.string().optional().describe('Display number of the invoice.'),
                    amount_applied: z.number().describe('Amount of this payment applied to the invoice.'),
                    balance: z.number().optional().describe('Unpaid balance remaining on the invoice.')
                })
            )
            .describe('Invoices the payment is applied to after the update.')
    })
    .describe('The customer payment after the update.');

/**
 * @tags: [read, write]
 * @tagReason: Reads the existing payment to fill in fields the caller omitted, then updates it.
 * @pitfalls: Omitted fields keep their current values; raising amount without an invoices array leaves the excess as unused credit, while lowering it below the total already applied is rejected unless a matching invoices array is supplied, and an invoice that is already fully paid cannot be re-applied.
 */
const action = createAction({
    description: "Update an existing customer payment's details (amount, mode, description, etc.).",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInvoice.customerpayments.ALL'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.zoho.com/invoice/api/v3/customer-payments/
        const existingResponse = await nango.get<unknown>({
            endpoint: `/invoice/v3/customerpayments/${encodeURIComponent(input.payment_id)}`,
            params: {
                organization_id: input.organization_id
            },
            retries: 3
        });

        const existing = GetPaymentResponseSchema.parse(existingResponse.data).payment;

        const customerId = input.customer_id ?? existing.customer_id;
        const paymentMode = input.payment_mode ?? existing.payment_mode;
        const amount = input.amount ?? existing.amount;
        const date = input.date ?? existing.date;

        if (customerId == null || paymentMode == null || amount == null || date == null) {
            throw new nango.ActionError({
                type: 'incomplete_payment',
                message: 'Could not determine the customer, payment mode, amount and date for the payment.'
            });
        }

        if (input.amount !== undefined && input.invoices === undefined) {
            const appliedTotal = (existing.invoices ?? []).reduce((sum, invoice) => sum + (invoice.amount_applied ?? 0), 0);
            if (input.amount < appliedTotal) {
                throw new nango.ActionError({
                    type: 'invalid_amount',
                    message: `amount ${input.amount} is less than the ${appliedTotal} already applied to invoices; supply an updated invoices array to reduce it.`
                });
            }
        }

        const body = {
            customer_id: customerId,
            payment_mode: paymentMode,
            amount: amount,
            date: date,
            ...(input.reference_number !== undefined && { reference_number: input.reference_number }),
            ...(input.description !== undefined && { description: input.description }),
            ...(input.invoices !== undefined && { invoices: input.invoices }),
            ...(input.exchange_rate !== undefined && { exchange_rate: input.exchange_rate }),
            ...(input.bank_charges !== undefined && { bank_charges: input.bank_charges }),
            ...(input.custom_fields !== undefined && { custom_fields: input.custom_fields })
        };

        // https://www.zoho.com/invoice/api/v3/customer-payments/
        const updateResponse = await nango.put<unknown>({
            endpoint: `/invoice/v3/customerpayments/${encodeURIComponent(input.payment_id)}`,
            params: {
                organization_id: input.organization_id
            },
            data: body,
            retries: 3
        });

        const updateResult = UpdatePaymentResponseSchema.parse(updateResponse.data);
        if (updateResult.code !== 0) {
            throw new nango.ActionError({
                type: 'payment_update_failed',
                message: updateResult.message ?? 'Zoho rejected the payment update.'
            });
        }

        if (!updateResult.payment) {
            throw new nango.ActionError({
                type: 'payment_update_failed',
                message: 'Zoho did not return the updated payment.'
            });
        }

        const updated = updateResult.payment;

        return {
            payment_id: updated.payment_id,
            ...(updated.payment_number != null && { payment_number: updated.payment_number }),
            customer_id: updated.customer_id ?? customerId,
            ...(updated.customer_name != null && { customer_name: updated.customer_name }),
            payment_mode: updated.payment_mode ?? paymentMode,
            amount: updated.amount ?? amount,
            date: updated.date ?? date,
            ...(updated.reference_number != null && { reference_number: updated.reference_number }),
            ...(updated.description != null && { description: updated.description }),
            ...(updated.payment_status != null && { payment_status: updated.payment_status }),
            ...(updated.unused_amount != null && { unused_amount: updated.unused_amount }),
            ...(updated.updated_time != null && { updated_time: updated.updated_time }),
            invoices: (updated.invoices ?? []).map((invoice) => ({
                invoice_id: invoice.invoice_id,
                ...(invoice.invoice_number != null && { invoice_number: invoice.invoice_number }),
                amount_applied: invoice.amount_applied ?? 0,
                ...(invoice.balance != null && { balance: invoice.balance })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
