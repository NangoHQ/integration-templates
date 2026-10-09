import { z } from 'zod';
import { createAction } from 'nango';

const OrganizationsResponseSchema = z.object({
    code: z.number(),
    organizations: z.array(z.object({ organization_id: z.string() })).optional()
});

const InvoicePaymentSchema = z.object({
    invoice_id: z.string().describe('Invoice ID to apply the payment to. Example: "260815000000103001"'),
    amount_applied: z.number().describe('Amount of the payment applied to this invoice.'),
    tax_amount_withheld: z.number().optional().describe('Amount withheld for tax on this invoice allocation.')
});

const CustomFieldSchema = z.object({
    label: z.string().describe('Label of the custom field.'),
    value: z.string().describe('Value of the custom field.')
});

const InputSchema = z
    .object({
        payment_id: z.string().describe('Customer payment ID. Example: "260815000000113012"'),
        organization_id: z
            .string()
            .optional()
            .describe(
                'Zoho Inventory organization ID. If omitted and only one organization exists, it is used automatically. Required when multiple organizations exist.'
            ),
        customer_id: z.string().optional().describe('Customer ID associated with the payment. Example: "260815000000097001"'),
        payment_mode: z.string().optional().describe('Payment mode: check, cash, creditcard, banktransfer, bankremittance, autotransaction or others.'),
        amount: z.number().optional().describe('Amount paid in this payment.'),
        date: z.string().optional().describe('Date the payment was made, in yyyy-mm-dd format. Example: "2026-06-09"'),
        reference_number: z.string().nullable().optional().describe('Reference number for the payment.'),
        description: z.string().nullable().optional().describe('Description of the payment.'),
        invoices: z.array(InvoicePaymentSchema).optional().describe('Invoice allocations for the payment. Omit to leave the existing allocations untouched.'),
        exchange_rate: z.number().optional().describe('Exchange rate between the invoice currency and the customer currency.'),
        bank_charges: z.number().optional().describe('Additional bank charges associated with the payment.'),
        account_id: z.string().optional().describe('ID of the cash or bank account the payment is deposited into.'),
        tax_account_id: z.string().optional().describe('ID of the tax account used when tax is withheld.'),
        location_id: z.string().optional().describe('Location ID associated with the payment.'),
        custom_fields: z.array(CustomFieldSchema).optional().describe('Custom fields to set on the payment.')
    })
    .describe('Input for updating an existing customer payment in Zoho Inventory.');

const ProviderInvoiceSchema = z.object({
    invoice_id: z.string().optional(),
    invoice_number: z.string().optional(),
    date: z.string().optional(),
    amount_applied: z.number().optional(),
    total: z.number().optional(),
    balance: z.number().optional(),
    tax_amount_withheld: z.number().optional()
});

const ProviderCustomFieldSchema = z.object({
    index: z.number().optional(),
    label: z.string().optional(),
    value: z.string().or(z.number()).optional(),
    data_type: z.string().optional()
});

const ProviderPaymentSchema = z.object({
    payment_id: z.string(),
    payment_number: z.string().optional(),
    date: z.string().optional(),
    payment_mode: z.string().optional(),
    amount: z.number().optional(),
    bcy_amount: z.number().optional(),
    unused_amount: z.number().optional(),
    amount_refunded: z.number().optional(),
    bank_charges: z.number().optional(),
    exchange_rate: z.number().optional(),
    tax_amount_withheld: z.number().optional(),
    account_id: z.string().optional(),
    account_name: z.string().optional(),
    description: z.string().optional(),
    reference_number: z.string().optional(),
    customer_id: z.string().optional(),
    customer_name: z.string().optional(),
    status: z.string().optional(),
    payment_status: z.string().optional(),
    currency_code: z.string().optional(),
    currency_symbol: z.string().optional(),
    location_id: z.string().optional(),
    location_name: z.string().optional(),
    created_time: z.string().optional(),
    updated_time: z.string().optional(),
    invoices: z.array(ProviderInvoiceSchema).optional(),
    custom_fields: z.array(ProviderCustomFieldSchema).optional()
});

const OutputInvoiceSchema = z.object({
    invoice_id: z.string().optional().describe('Invoice ID the payment was applied to.'),
    invoice_number: z.string().optional().describe('Invoice number the payment was applied to. Example: "INV-000001"'),
    date: z.string().optional().describe('Date of the invoice.'),
    amount_applied: z.number().optional().describe('Amount of the payment applied to the invoice.'),
    total: z.number().optional().describe('Total amount of the invoice.'),
    balance: z.number().optional().describe('Remaining balance on the invoice after the payment.'),
    tax_amount_withheld: z.number().optional().describe('Tax amount withheld on this invoice allocation.')
});

const OutputCustomFieldSchema = z.object({
    index: z.number().optional().describe('Index of the custom field.'),
    label: z.string().optional().describe('Label of the custom field.'),
    value: z.string().or(z.number()).optional().describe('Value of the custom field.'),
    data_type: z.string().optional().describe('Data type of the custom field.')
});

const OutputSchema = z
    .object({
        payment_id: z.string().describe('Unique ID of the updated payment.'),
        payment_number: z.string().optional().describe('Payment number within the organization.'),
        date: z.string().optional().describe('Date the payment was made.'),
        payment_mode: z.string().optional().describe('Mode through which the payment was made.'),
        amount: z.number().optional().describe('Payment amount.'),
        bcy_amount: z.number().optional().describe('Payment amount in the base currency.'),
        unused_amount: z.number().optional().describe('Portion of the payment not yet applied to any invoice.'),
        amount_refunded: z.number().optional().describe('Amount refunded from the payment.'),
        bank_charges: z.number().optional().describe('Additional bank charges.'),
        exchange_rate: z.number().optional().describe('Exchange rate applied to the payment.'),
        tax_amount_withheld: z.number().optional().describe('Tax amount withheld from the payment.'),
        account_id: z.string().optional().describe('ID of the account the payment is deposited into.'),
        account_name: z.string().optional().describe('Name of the account the payment is deposited into.'),
        description: z.string().optional().describe('Description of the payment.'),
        reference_number: z.string().optional().describe('Reference number of the payment.'),
        customer_id: z.string().optional().describe('Customer ID associated with the payment.'),
        customer_name: z.string().optional().describe('Customer name associated with the payment.'),
        invoice_numbers: z.string().optional().describe('Comma-separated invoice numbers the payment is applied to.'),
        status: z.string().optional().describe('Payment status returned by the provider.'),
        payment_status: z.string().optional().describe('Status of the payment (for example "paid" or "unused").'),
        currency_code: z.string().optional().describe('Currency code of the payment. Example: "USD"'),
        currency_symbol: z.string().optional().describe('Currency symbol of the payment. Example: "$"'),
        location_id: z.string().optional().describe('Location ID associated with the payment.'),
        location_name: z.string().optional().describe('Location name associated with the payment.'),
        created_time: z.string().optional().describe('Timestamp when the payment was created.'),
        updated_time: z.string().optional().describe('Timestamp when the payment was last updated.'),
        invoices: z.array(OutputInvoiceSchema).optional().describe('Invoices the payment is applied to.'),
        custom_fields: z.array(OutputCustomFieldSchema).optional().describe('Custom fields set on the payment.')
    })
    .describe('The updated customer payment.');

/**
 * @tags: [write]
 * @tagReason: Updates an existing customer payment's fields and invoice allocations in Zoho Inventory.
 * @pitfalls: Omitting invoices updates only payment-level fields and leaves existing invoice allocations unchanged; re-sending an allocation that already covers an invoice fails with a balance-due error because Zoho revalidates it against the invoice's current remaining balance.
 */
const action = createAction({
    description: 'Update an existing customer payment in Zoho Inventory.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInventory.customerpayments.UPDATE', 'ZohoInventory.settings.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let organizationId = input.organization_id;
        if (!organizationId) {
            // https://www.zoho.com/inventory/api/v1/organizations/#list-organizations
            const orgResponse = await nango.get({
                endpoint: '/inventory/v1/organizations',
                retries: 3
            });
            const orgData = OrganizationsResponseSchema.parse(orgResponse.data);
            if (orgData.code !== 0) {
                throw new nango.ActionError({
                    type: 'provider_error',
                    message: 'Failed to retrieve organizations from Zoho Inventory.'
                });
            }
            if (!orgData.organizations || orgData.organizations.length === 0) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: 'No organizations found for this Zoho Inventory account.'
                });
            }
            if (orgData.organizations.length > 1) {
                throw new nango.ActionError({
                    type: 'multiple_organizations',
                    message: `Multiple organizations found (${orgData.organizations.map((o) => o.organization_id).join(', ')}). Provide organization_id in the action input.`
                });
            }
            const singleOrg = orgData.organizations[0];
            if (!singleOrg) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: 'No organizations found for this Zoho Inventory account.'
                });
            }
            organizationId = singleOrg.organization_id;
        }

        const data = {
            ...(input.customer_id !== undefined && { customer_id: input.customer_id }),
            ...(input.payment_mode !== undefined && { payment_mode: input.payment_mode }),
            ...(input.amount !== undefined && { amount: input.amount }),
            ...(input.date !== undefined && { date: input.date }),
            ...(input.reference_number !== undefined && { reference_number: input.reference_number }),
            ...(input.description !== undefined && { description: input.description }),
            ...(input.invoices !== undefined && {
                invoices: input.invoices.map((invoice) => ({
                    invoice_id: invoice.invoice_id,
                    amount_applied: invoice.amount_applied,
                    ...(invoice.tax_amount_withheld !== undefined && { tax_amount_withheld: invoice.tax_amount_withheld })
                }))
            }),
            ...(input.exchange_rate !== undefined && { exchange_rate: input.exchange_rate }),
            ...(input.bank_charges !== undefined && { bank_charges: input.bank_charges }),
            ...(input.account_id !== undefined && { account_id: input.account_id }),
            ...(input.tax_account_id !== undefined && { tax_account_id: input.tax_account_id }),
            ...(input.location_id !== undefined && { location_id: input.location_id }),
            ...(input.custom_fields !== undefined && { custom_fields: input.custom_fields })
        };

        // https://www.zoho.com/inventory/api/v1/customer-payments/#update-a-payment
        const response = await nango.put({
            endpoint: `/inventory/v1/customerpayments/${encodeURIComponent(input.payment_id)}`,
            params: {
                organization_id: organizationId
            },
            data,
            retries: 3
        });

        const wrapper = z
            .object({
                code: z.number(),
                message: z.string().optional(),
                payment: z.unknown().optional()
            })
            .parse(response.data);

        if (!wrapper.payment) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Provider did not return a payment object.'
            });
        }

        const payment = ProviderPaymentSchema.parse(wrapper.payment);

        const invoiceNumbers = payment.invoices?.map((invoice) => invoice.invoice_number).filter((number): number is string => number !== undefined);

        return {
            payment_id: payment.payment_id,
            ...(payment.payment_number !== undefined && { payment_number: payment.payment_number }),
            ...(payment.date !== undefined && { date: payment.date }),
            ...(payment.payment_mode !== undefined && { payment_mode: payment.payment_mode }),
            ...(payment.amount !== undefined && { amount: payment.amount }),
            ...(payment.bcy_amount !== undefined && { bcy_amount: payment.bcy_amount }),
            ...(payment.unused_amount !== undefined && { unused_amount: payment.unused_amount }),
            ...(payment.amount_refunded !== undefined && { amount_refunded: payment.amount_refunded }),
            ...(payment.bank_charges !== undefined && { bank_charges: payment.bank_charges }),
            ...(payment.exchange_rate !== undefined && { exchange_rate: payment.exchange_rate }),
            ...(payment.tax_amount_withheld !== undefined && { tax_amount_withheld: payment.tax_amount_withheld }),
            ...(payment.account_id !== undefined && { account_id: payment.account_id }),
            ...(payment.account_name !== undefined && { account_name: payment.account_name }),
            ...(payment.description !== undefined && { description: payment.description }),
            ...(payment.reference_number !== undefined && { reference_number: payment.reference_number }),
            ...(payment.customer_id !== undefined && { customer_id: payment.customer_id }),
            ...(payment.customer_name !== undefined && { customer_name: payment.customer_name }),
            ...(invoiceNumbers !== undefined && invoiceNumbers.length > 0 && { invoice_numbers: invoiceNumbers.join(',') }),
            ...(payment.status !== undefined && { status: payment.status }),
            ...(payment.payment_status !== undefined && { payment_status: payment.payment_status }),
            ...(payment.currency_code !== undefined && { currency_code: payment.currency_code }),
            ...(payment.currency_symbol !== undefined && { currency_symbol: payment.currency_symbol }),
            ...(payment.location_id !== undefined && { location_id: payment.location_id }),
            ...(payment.location_name !== undefined && { location_name: payment.location_name }),
            ...(payment.created_time !== undefined && { created_time: payment.created_time }),
            ...(payment.updated_time !== undefined && { updated_time: payment.updated_time }),
            ...(payment.invoices !== undefined && {
                invoices: payment.invoices.map((invoice) => ({
                    ...(invoice.invoice_id !== undefined && { invoice_id: invoice.invoice_id }),
                    ...(invoice.invoice_number !== undefined && { invoice_number: invoice.invoice_number }),
                    ...(invoice.date !== undefined && { date: invoice.date }),
                    ...(invoice.amount_applied !== undefined && { amount_applied: invoice.amount_applied }),
                    ...(invoice.total !== undefined && { total: invoice.total }),
                    ...(invoice.balance !== undefined && { balance: invoice.balance }),
                    ...(invoice.tax_amount_withheld !== undefined && { tax_amount_withheld: invoice.tax_amount_withheld })
                }))
            }),
            ...(payment.custom_fields !== undefined && {
                custom_fields: payment.custom_fields.map((field) => ({
                    ...(field.index !== undefined && { index: field.index }),
                    ...(field.label !== undefined && { label: field.label }),
                    ...(field.value !== undefined && { value: field.value }),
                    ...(field.data_type !== undefined && { data_type: field.data_type })
                }))
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
