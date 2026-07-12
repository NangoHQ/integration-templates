import { z } from 'zod';
import { createAction } from 'nango';

const DiscountSchema = z.object({
    type: z.enum(['absolute', 'relative']),
    value: z.string()
});

const InvoiceLineCreateProductSchema = z.object({
    product_id: z
        .number()
        .describe('The product ID. Auto-fills label, raw_currency_unit_price, unit, vat_rate, and ledger_account_id from the product. Example: 42'),
    quantity: z.number().describe('Line item quantity. Example: 12'),
    label: z.string().optional().describe('Line item label. Example: Demo label'),
    ledger_account_id: z.number().optional().describe('The ledger account ID. Example: 1255'),
    raw_currency_unit_price: z.string().optional().describe('The unit price excluding taxes. Can be set up to 6 decimals. Example: 33.333334'),
    unit: z.string().optional().describe('Line item unit. Example: piece'),
    vat_rate: z.string().optional().describe('Product VAT rate. A 20% VAT in France is FR_200. Example: FR_200'),
    section_rank: z.number().optional().describe('Has to correspond to the rank number of a line items section. Example: 1'),
    discount: DiscountSchema.optional(),
    description: z.string().nullable().optional().describe('The description of the invoice line')
});

const InvoiceLineCreateStandardSchema = z.object({
    label: z.string().describe('Line item label. Example: Demo label'),
    raw_currency_unit_price: z.string().describe('The unit price excluding taxes. Can be set up to 6 decimals. Example: 33.333334'),
    unit: z.string().describe('Line item unit. Example: piece'),
    vat_rate: z.string().describe('Product VAT rate. A 20% VAT in France is FR_200. Example: FR_200'),
    quantity: z.number().describe('Line item quantity. Example: 12'),
    ledger_account_id: z.number().optional().describe('The ledger account ID. Example: 1255'),
    section_rank: z.number().optional().describe('Has to correspond to the rank number of a line items section. Example: 1'),
    discount: DiscountSchema.optional(),
    description: z.string().nullable().optional().describe('The description of the invoice line')
});

const InvoiceLineUpdateSchema = z.object({
    id: z.number().describe('ID of the invoice line. Example: 42'),
    label: z.string().optional().describe('Line item label. Example: Demo label'),
    quantity: z.number().optional().describe('Line item quantity. Example: 12'),
    ledger_account_id: z.number().optional().describe('The ledger account ID. Example: 1255'),
    raw_currency_unit_price: z.string().optional().describe('The unit price excluding taxes. Can be set up to 6 decimals. Example: 33.333334'),
    unit: z.string().optional().describe('Line item unit. Example: piece'),
    vat_rate: z.string().optional().describe('Product VAT rate. Example: FR_200'),
    description: z.string().nullable().optional().describe('The description of the invoice line'),
    product_id: z.number().optional().describe('The product ID. Example: 42'),
    discount: DiscountSchema.optional(),
    section_rank: z.number().optional().describe('Has to correspond to the rank number of an invoice line section. Example: 1')
});

const InvoiceLineDeleteSchema = z.object({
    id: z.number().describe('ID of the invoice line. Example: 42')
});

const InvoiceLinesInputSchema = z.object({
    create: z.array(z.union([InvoiceLineCreateProductSchema, InvoiceLineCreateStandardSchema])).optional(),
    update: z.array(InvoiceLineUpdateSchema).optional(),
    delete: z.array(InvoiceLineDeleteSchema).optional()
});

const TransactionReferenceSchema = z.object({
    banking_provider: z.enum(['stripe', 'gocardless', 'bank', 'budgetinsight']).describe('The banking provider for the transaction. Example: bank'),
    provider_field_name: z
        .enum(['payment_id', 'charge_id', 'report_id', 'webid', 'label'])
        .describe('Name of the field that you want to match. Example: label'),
    provider_field_value: z.string().describe('Value that you want to match. Example: invoice_number')
});

const InputSchema = z.object({
    id: z.number().describe('The unique identifier of the customer invoice. Example: 42'),
    date: z.string().optional().describe('Invoice date (ISO 8601). Example: 2023-08-30'),
    deadline: z.string().optional().describe('Invoice payment deadline (ISO 8601). Example: 2023-08-30'),
    customer_id: z.number().optional().describe('Customer identifier. Example: 42'),
    customer_invoice_template_id: z.number().optional().describe('The customer invoice template ID. Example: 42'),
    pdf_invoice_free_text: z.string().nullable().optional().describe('For example, the contact details of the person to contact'),
    pdf_invoice_subject: z.string().nullable().optional().describe('Invoice title'),
    pdf_description: z.string().nullable().optional().describe('Invoice description. Maximum 5,000 characters.'),
    currency: z.string().optional().describe('Invoice Currency (ISO 4217). Default is EUR.'),
    special_mention: z.string().nullable().optional().describe('Additional details. maximum 20,000 characters.'),
    discount: DiscountSchema.nullable().optional(),
    language: z.enum(['fr_FR', 'en_GB', 'de_DE']).optional().describe('The local default is based on the thirdparty billing_language.'),
    invoice_lines: InvoiceLinesInputSchema.optional(),
    label: z.string().nullable().optional().describe('Custom label for the invoice used on accounting (ledger) entries.'),
    external_reference: z
        .string()
        .optional()
        .describe('The unique external reference that was assigned during creation either by you or Pennylane. Example: FR123'),
    transaction_reference: TransactionReferenceSchema.nullable().optional()
});

const ProviderCustomerInvoiceSchema = z.object({
    id: z.number(),
    label: z.string().nullable(),
    invoice_number: z.string(),
    currency: z.string(),
    amount: z.string(),
    currency_amount: z.string(),
    currency_amount_before_tax: z.string(),
    exchange_rate: z.string(),
    date: z.string().nullable(),
    deadline: z.string().nullable(),
    currency_tax: z.string(),
    tax: z.string(),
    language: z.string(),
    paid: z.boolean(),
    status: z.string(),
    discount: z
        .object({
            type: z.string(),
            value: z.string()
        })
        .nullable(),
    ledger_entry: z
        .object({
            id: z.number()
        })
        .nullable(),
    public_file_url: z.string().nullable(),
    filename: z.string().nullable(),
    remaining_amount_with_tax: z.string().nullable(),
    remaining_amount_without_tax: z.string().nullable(),
    draft: z.boolean(),
    special_mention: z.string().nullable(),
    customer: z
        .object({
            id: z.number(),
            url: z.string()
        })
        .nullable(),
    invoice_line_sections: z
        .object({
            url: z.string()
        })
        .nullable(),
    invoice_lines: z
        .object({
            url: z.string()
        })
        .nullable(),
    custom_header_fields: z
        .object({
            url: z.string()
        })
        .nullable(),
    categories: z
        .object({
            url: z.string()
        })
        .nullable(),
    pdf_invoice_free_text: z.string().nullable(),
    pdf_invoice_subject: z.string().nullable(),
    pdf_description: z.string().nullable(),
    billing_subscription: z
        .object({
            id: z.number()
        })
        .nullable(),
    credited_invoice: z
        .object({
            id: z.number(),
            url: z.string()
        })
        .nullable(),
    customer_invoice_template: z
        .object({
            id: z.number()
        })
        .nullable(),
    transaction_reference: z
        .object({
            banking_provider: z.string(),
            provider_field_name: z.string(),
            provider_field_value: z.string()
        })
        .nullable(),
    payments: z
        .object({
            url: z.string()
        })
        .nullable(),
    matched_transactions: z
        .object({
            url: z.string()
        })
        .nullable(),
    appendices: z
        .object({
            url: z.string()
        })
        .nullable(),
    quote: z
        .object({
            id: z.number()
        })
        .nullable(),
    external_reference: z.string().nullable(),
    e_invoicing: z
        .object({
            status: z.string(),
            reason: z.string().nullable(),
            flow: z
                .object({
                    id: z.string()
                })
                .nullable()
        })
        .nullable(),
    factur_x: z.boolean().nullable(),
    archived_at: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string()
});

const OutputSchema = z.object({
    id: z.number(),
    label: z.string().nullable().optional(),
    invoice_number: z.string().optional(),
    currency: z.string().optional(),
    amount: z.string().optional(),
    currency_amount: z.string().optional(),
    date: z.string().nullable().optional(),
    deadline: z.string().nullable().optional(),
    status: z.string().optional(),
    paid: z.boolean().optional(),
    draft: z.boolean().optional(),
    customer_id: z.number().nullable().optional(),
    special_mention: z.string().nullable().optional(),
    pdf_invoice_subject: z.string().nullable().optional(),
    pdf_description: z.string().nullable().optional(),
    external_reference: z.string().nullable().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

function buildRequestBody(input: z.infer<typeof InputSchema>): Record<string, unknown> {
    const body: Record<string, unknown> = {};

    if (input.date !== undefined) {
        body['date'] = input.date;
    }
    if (input.deadline !== undefined) {
        body['deadline'] = input.deadline;
    }
    if (input.customer_id !== undefined) {
        body['customer_id'] = input.customer_id;
    }
    if (input.customer_invoice_template_id !== undefined) {
        body['customer_invoice_template_id'] = input.customer_invoice_template_id;
    }
    if (input.pdf_invoice_free_text !== undefined) {
        body['pdf_invoice_free_text'] = input.pdf_invoice_free_text;
    }
    if (input.pdf_invoice_subject !== undefined) {
        body['pdf_invoice_subject'] = input.pdf_invoice_subject;
    }
    if (input.pdf_description !== undefined) {
        body['pdf_description'] = input.pdf_description;
    }
    if (input.currency !== undefined) {
        body['currency'] = input.currency;
    }
    if (input.special_mention !== undefined) {
        body['special_mention'] = input.special_mention;
    }
    if (input.discount !== undefined) {
        body['discount'] = input.discount;
    }
    if (input.language !== undefined) {
        body['language'] = input.language;
    }
    if (input.invoice_lines !== undefined) {
        body['invoice_lines'] = input.invoice_lines;
    }
    if (input.label !== undefined) {
        body['label'] = input.label;
    }
    if (input.external_reference !== undefined) {
        body['external_reference'] = input.external_reference;
    }
    if (input.transaction_reference !== undefined) {
        body['transaction_reference'] = input.transaction_reference;
    }

    return body;
}

const action = createAction({
    description: 'Update a customer invoice.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['customer_invoices:all'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body = buildRequestBody(input);

        const response = await nango.put({
            // https://pennylane.readme.io/reference/updatecustomerinvoice
            endpoint: `/api/external/v2/customer_invoices/${encodeURIComponent(input.id)}`,
            data: body,
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Pennylane API: response data is not an object.'
            });
        }

        const providerInvoice = ProviderCustomerInvoiceSchema.parse(response.data);

        return {
            id: providerInvoice.id,
            ...(providerInvoice.label !== null && { label: providerInvoice.label }),
            invoice_number: providerInvoice.invoice_number,
            currency: providerInvoice.currency,
            amount: providerInvoice.amount,
            currency_amount: providerInvoice.currency_amount,
            ...(providerInvoice.date !== null && { date: providerInvoice.date }),
            ...(providerInvoice.deadline !== null && { deadline: providerInvoice.deadline }),
            status: providerInvoice.status,
            paid: providerInvoice.paid,
            draft: providerInvoice.draft,
            ...(providerInvoice.customer !== null && { customer_id: providerInvoice.customer.id }),
            ...(providerInvoice.special_mention !== null && { special_mention: providerInvoice.special_mention }),
            ...(providerInvoice.pdf_invoice_subject !== null && { pdf_invoice_subject: providerInvoice.pdf_invoice_subject }),
            ...(providerInvoice.pdf_description !== null && { pdf_description: providerInvoice.pdf_description }),
            ...(providerInvoice.external_reference !== null && { external_reference: providerInvoice.external_reference }),
            created_at: providerInvoice.created_at,
            updated_at: providerInvoice.updated_at
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
