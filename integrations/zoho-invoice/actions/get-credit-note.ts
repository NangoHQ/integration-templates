import { z } from 'zod';
import { createAction } from 'nango';

const AddressSchema = z.object({
    address: z.string().optional().describe('Primary street address line.'),
    street2: z.string().optional().describe('Second street address line.'),
    city: z.string().optional().describe('City of the address.'),
    state: z.string().optional().describe('State or province of the address.'),
    zip: z.string().optional().describe('Postal or ZIP code of the address.'),
    country: z.string().optional().describe('Country of the address.'),
    fax: z.string().optional().describe('Fax number associated with the address.'),
    phone: z.string().optional().describe('Phone number associated with the address.'),
    attention: z.string().optional().describe('Person or department the address is addressed to.')
});

const LineItemSchema = z.object({
    line_item_id: z.string().optional().describe('Unique ID of the credit note line item.'),
    item_id: z.string().optional().describe('ID of the catalog item, empty for free-text line items.'),
    name: z.string().optional().describe('Name of the line item.'),
    description: z.string().optional().describe('Description of the line item.'),
    quantity: z.number().optional().describe('Quantity of the item credited.'),
    unit: z.string().optional().describe('Unit of measure for the line item.'),
    rate: z.number().optional().describe('Unit rate of the line item.'),
    tax_name: z.string().optional().describe('Name of the tax applied to the line item.'),
    tax_percentage: z.number().optional().describe('Tax percentage applied to the line item.'),
    item_total: z.number().optional().describe('Total amount for the line item.')
});

const CreditedInvoiceSchema = z.object({
    invoice_id: z.string().optional().describe('ID of the invoice the credit was applied to.'),
    creditnote_invoice_id: z.string().optional().describe('ID of the credit application record.'),
    date: z.string().optional().describe('Date the credit was applied to the invoice.'),
    invoice_number: z.string().optional().describe('Number of the invoice the credit was applied to.'),
    credited_amount: z.number().optional().describe('Amount of credit applied to the invoice.')
});

const InputSchema = z
    .object({
        creditnote_id: z.string().describe('ID of the credit note to retrieve. Example: "260815000000121027"'),
        organization_id: z
            .string()
            .optional()
            .describe('Zoho Invoice organization ID. Zoho requires it on every call; pass it explicitly because this connection cannot look it up.')
    })
    .describe('Input for retrieving a single Zoho Invoice credit note by ID.');

const OutputSchema = z
    .object({
        creditnote_id: z.string().describe('Unique ID of the credit note.'),
        creditnote_number: z.string().optional().describe('Credit note number, prefixed with CN.'),
        status: z.string().optional().describe('Status of the credit note: open, closed, or void.'),
        date: z.string().optional().describe('Date the credit note was raised (yyyy-mm-dd).'),
        issued_date: z.string().optional().describe('Date the credit note was issued (yyyy-mm-dd).'),
        reference_number: z.string().optional().describe('Reference number associated with the credit note.'),
        customer_id: z.string().optional().describe('ID of the customer the credit note was raised for.'),
        customer_name: z.string().optional().describe('Name of the customer the credit note was raised for.'),
        currency_id: z.string().optional().describe('ID of the currency used by the credit note.'),
        currency_code: z.string().optional().describe('Currency code. Example: "USD"'),
        currency_symbol: z.string().optional().describe('Currency symbol. Example: "$"'),
        exchange_rate: z.number().optional().describe('Exchange rate applied to the credit note.'),
        sub_total: z.number().optional().describe('Subtotal of the credit note before taxes and adjustments.'),
        tax_total: z.number().optional().describe('Total tax applied to the credit note.'),
        total: z.number().optional().describe('Total credits raised by the credit note.'),
        total_credits_used: z.number().optional().describe('Total amount of credit already applied to invoices.'),
        total_refunded_amount: z.number().optional().describe('Total amount refunded from the credit note.'),
        balance: z.number().optional().describe('Unapplied credit remaining on the credit note.'),
        discount: z.number().optional().describe('Discount applied to the credit note.'),
        is_emailed: z.boolean().optional().describe('Whether the credit note has been emailed to the customer.'),
        is_inclusive_tax: z.boolean().optional().describe('Whether line item rates already include tax.'),
        notes: z.string().optional().describe('Notes displayed on the credit note.'),
        terms: z.string().optional().describe('Terms and conditions displayed on the credit note.'),
        created_time: z.string().optional().describe('Time the credit note was created.'),
        last_modified_time: z.string().optional().describe('Time the credit note was last modified.'),
        created_by_name: z.string().optional().describe('Name of the user who created the credit note.'),
        template_name: z.string().optional().describe('Name of the template used to render the credit note.'),
        line_items: z.array(LineItemSchema).optional().describe('Line items included in the credit note.'),
        invoices_credited: z.array(CreditedInvoiceSchema).optional().describe('Invoices this credit note has been applied to.'),
        billing_address: AddressSchema.optional().describe('Billing address recorded on the credit note.'),
        shipping_address: AddressSchema.optional().describe('Shipping address recorded on the credit note.')
    })
    .describe('A single Zoho Invoice credit note with its status, totals, balance, line items, and credited invoices.');

const ProviderAddressSchema = z.object({
    address: z.string().nullish(),
    street2: z.string().nullish(),
    city: z.string().nullish(),
    state: z.string().nullish(),
    zip: z.string().nullish(),
    country: z.string().nullish(),
    fax: z.string().nullish(),
    phone: z.string().nullish(),
    attention: z.string().nullish()
});

const ProviderLineItemSchema = z.object({
    line_item_id: z.string().nullish(),
    item_id: z.string().nullish(),
    name: z.string().nullish(),
    description: z.string().nullish(),
    quantity: z.number().nullish(),
    unit: z.string().nullish(),
    rate: z.number().nullish(),
    tax_name: z.string().nullish(),
    tax_percentage: z.number().nullish(),
    item_total: z.number().nullish()
});

const ProviderCreditedInvoiceSchema = z.object({
    invoice_id: z.string().nullish(),
    creditnote_invoice_id: z.string().nullish(),
    date: z.string().nullish(),
    invoice_number: z.string().nullish(),
    credited_amount: z.number().nullish()
});

const ProviderCreditNoteSchema = z.object({
    creditnote_id: z.string(),
    creditnote_number: z.string().nullish(),
    status: z.string().nullish(),
    date: z.string().nullish(),
    issued_date: z.string().nullish(),
    reference_number: z.string().nullish(),
    customer_id: z.string().nullish(),
    customer_name: z.string().nullish(),
    currency_id: z.string().nullish(),
    currency_code: z.string().nullish(),
    currency_symbol: z.string().nullish(),
    exchange_rate: z.number().nullish(),
    sub_total: z.number().nullish(),
    tax_total: z.number().nullish(),
    total: z.number().nullish(),
    total_credits_used: z.number().nullish(),
    total_refunded_amount: z.number().nullish(),
    balance: z.number().nullish(),
    discount: z.number().nullish(),
    is_emailed: z.boolean().nullish(),
    is_inclusive_tax: z.boolean().nullish(),
    notes: z.string().nullish(),
    terms: z.string().nullish(),
    created_time: z.string().nullish(),
    last_modified_time: z.string().nullish(),
    created_by_name: z.string().nullish(),
    template_name: z.string().nullish(),
    line_items: z.array(ProviderLineItemSchema).optional(),
    invoices_credited: z.array(ProviderCreditedInvoiceSchema).optional(),
    billing_address: ProviderAddressSchema.optional(),
    shipping_address: ProviderAddressSchema.optional()
});

const ProviderResponseSchema = z.object({
    code: z.number(),
    message: z.string(),
    creditnote: ProviderCreditNoteSchema.optional()
});

/**
 * @tags: [read]
 * @tagReason: Retrieves a single credit note from Zoho Invoice without creating, updating, or deleting any provider data.
 * @pitfalls: organization_id is optional in the input but Zoho requires it on every call and this connection's scope cannot look it up, so omitting it fails; a non-existent credit note ID returns a not-found error.
 */
const action = createAction({
    description: 'Retrieve a single credit note by ID from Zoho Invoice.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInvoice.creditnotes.ALL'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.zoho.com/invoice/api/v3/credit-notes/#get-a-credit-note
        const response = await nango.get({
            endpoint: `/invoice/v3/creditnotes/${encodeURIComponent(input.creditnote_id)}`,
            params: {
                ...(input.organization_id != null && { organization_id: input.organization_id })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.code !== 0 || providerResponse.creditnote == null) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Credit note ${input.creditnote_id} was not found.`
            });
        }

        const creditNote = providerResponse.creditnote;

        return {
            creditnote_id: creditNote.creditnote_id,
            ...(creditNote.creditnote_number != null && { creditnote_number: creditNote.creditnote_number }),
            ...(creditNote.status != null && { status: creditNote.status }),
            ...(creditNote.date != null && { date: creditNote.date }),
            ...(creditNote.issued_date != null && { issued_date: creditNote.issued_date }),
            ...(creditNote.reference_number != null && { reference_number: creditNote.reference_number }),
            ...(creditNote.customer_id != null && { customer_id: creditNote.customer_id }),
            ...(creditNote.customer_name != null && { customer_name: creditNote.customer_name }),
            ...(creditNote.currency_id != null && { currency_id: creditNote.currency_id }),
            ...(creditNote.currency_code != null && { currency_code: creditNote.currency_code }),
            ...(creditNote.currency_symbol != null && { currency_symbol: creditNote.currency_symbol }),
            ...(creditNote.exchange_rate != null && { exchange_rate: creditNote.exchange_rate }),
            ...(creditNote.sub_total != null && { sub_total: creditNote.sub_total }),
            ...(creditNote.tax_total != null && { tax_total: creditNote.tax_total }),
            ...(creditNote.total != null && { total: creditNote.total }),
            ...(creditNote.total_credits_used != null && { total_credits_used: creditNote.total_credits_used }),
            ...(creditNote.total_refunded_amount != null && { total_refunded_amount: creditNote.total_refunded_amount }),
            ...(creditNote.balance != null && { balance: creditNote.balance }),
            ...(creditNote.discount != null && { discount: creditNote.discount }),
            ...(creditNote.is_emailed != null && { is_emailed: creditNote.is_emailed }),
            ...(creditNote.is_inclusive_tax != null && { is_inclusive_tax: creditNote.is_inclusive_tax }),
            ...(creditNote.notes != null && { notes: creditNote.notes }),
            ...(creditNote.terms != null && { terms: creditNote.terms }),
            ...(creditNote.created_time != null && { created_time: creditNote.created_time }),
            ...(creditNote.last_modified_time != null && { last_modified_time: creditNote.last_modified_time }),
            ...(creditNote.created_by_name != null && { created_by_name: creditNote.created_by_name }),
            ...(creditNote.template_name != null && { template_name: creditNote.template_name }),
            ...(creditNote.line_items != null && {
                line_items: creditNote.line_items.map((lineItem) => ({
                    ...(lineItem.line_item_id != null && { line_item_id: lineItem.line_item_id }),
                    ...(lineItem.item_id != null && { item_id: lineItem.item_id }),
                    ...(lineItem.name != null && { name: lineItem.name }),
                    ...(lineItem.description != null && { description: lineItem.description }),
                    ...(lineItem.quantity != null && { quantity: lineItem.quantity }),
                    ...(lineItem.unit != null && { unit: lineItem.unit }),
                    ...(lineItem.rate != null && { rate: lineItem.rate }),
                    ...(lineItem.tax_name != null && { tax_name: lineItem.tax_name }),
                    ...(lineItem.tax_percentage != null && { tax_percentage: lineItem.tax_percentage }),
                    ...(lineItem.item_total != null && { item_total: lineItem.item_total })
                }))
            }),
            ...(creditNote.invoices_credited != null && {
                invoices_credited: creditNote.invoices_credited.map((creditedInvoice) => ({
                    ...(creditedInvoice.invoice_id != null && { invoice_id: creditedInvoice.invoice_id }),
                    ...(creditedInvoice.creditnote_invoice_id != null && { creditnote_invoice_id: creditedInvoice.creditnote_invoice_id }),
                    ...(creditedInvoice.date != null && { date: creditedInvoice.date }),
                    ...(creditedInvoice.invoice_number != null && { invoice_number: creditedInvoice.invoice_number }),
                    ...(creditedInvoice.credited_amount != null && { credited_amount: creditedInvoice.credited_amount })
                }))
            }),
            ...(creditNote.billing_address != null && {
                billing_address: {
                    ...(creditNote.billing_address.address != null && { address: creditNote.billing_address.address }),
                    ...(creditNote.billing_address.street2 != null && { street2: creditNote.billing_address.street2 }),
                    ...(creditNote.billing_address.city != null && { city: creditNote.billing_address.city }),
                    ...(creditNote.billing_address.state != null && { state: creditNote.billing_address.state }),
                    ...(creditNote.billing_address.zip != null && { zip: creditNote.billing_address.zip }),
                    ...(creditNote.billing_address.country != null && { country: creditNote.billing_address.country }),
                    ...(creditNote.billing_address.fax != null && { fax: creditNote.billing_address.fax }),
                    ...(creditNote.billing_address.phone != null && { phone: creditNote.billing_address.phone }),
                    ...(creditNote.billing_address.attention != null && { attention: creditNote.billing_address.attention })
                }
            }),
            ...(creditNote.shipping_address != null && {
                shipping_address: {
                    ...(creditNote.shipping_address.address != null && { address: creditNote.shipping_address.address }),
                    ...(creditNote.shipping_address.street2 != null && { street2: creditNote.shipping_address.street2 }),
                    ...(creditNote.shipping_address.city != null && { city: creditNote.shipping_address.city }),
                    ...(creditNote.shipping_address.state != null && { state: creditNote.shipping_address.state }),
                    ...(creditNote.shipping_address.zip != null && { zip: creditNote.shipping_address.zip }),
                    ...(creditNote.shipping_address.country != null && { country: creditNote.shipping_address.country }),
                    ...(creditNote.shipping_address.fax != null && { fax: creditNote.shipping_address.fax }),
                    ...(creditNote.shipping_address.phone != null && { phone: creditNote.shipping_address.phone }),
                    ...(creditNote.shipping_address.attention != null && { attention: creditNote.shipping_address.attention })
                }
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
