import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    quote_id: z.number().describe('Quote identifier to create the invoice from. Example: 25461979840512'),
    draft: z.boolean().describe('Indicates if the invoice should be created as draft (has not been finalized)'),
    external_reference: z.string().optional().describe('A unique external reference you can provide to track this customer invoice'),
    customer_invoice_template_id: z.number().optional().describe('The customer invoice template ID')
});

const ProviderCustomerSchema = z.object({
    id: z.number(),
    url: z.string()
});

const ProviderInvoiceUrlCollectionSchema = z.object({
    url: z.string()
});

const ProviderDiscountSchema = z.object({
    type: z.union([z.literal('absolute'), z.literal('relative')]),
    value: z.string()
});

const ProviderLedgerEntrySchema = z.object({
    id: z.number()
});

const ProviderCreditedInvoiceSchema = z.object({
    id: z.number(),
    url: z.string()
});

const ProviderCustomerInvoiceTemplateSchema = z.object({
    id: z.number()
});

const ProviderBillingSubscriptionSchema = z.object({
    id: z.number()
});

const ProviderTransactionReferenceSchema = z.object({
    banking_provider: z.string(),
    provider_field_name: z.string(),
    provider_field_value: z.string()
});

const ProviderEInvoicingSchema = z.object({
    status: z.string(),
    reason: z.string().nullable().optional(),
    flow: z
        .object({
            id: z.string()
        })
        .nullable()
        .optional()
});

const ProviderCustomerInvoiceSchema = z.object({
    id: z.number(),
    label: z.string().nullable().optional(),
    invoice_number: z.string(),
    currency: z.string(),
    amount: z.string(),
    currency_amount: z.string(),
    currency_amount_before_tax: z.string(),
    exchange_rate: z.string(),
    date: z.string().nullable().optional(),
    deadline: z.string().nullable().optional(),
    currency_tax: z.string(),
    tax: z.string(),
    language: z.string(),
    paid: z.boolean(),
    status: z.string(),
    discount: ProviderDiscountSchema.nullable().optional(),
    ledger_entry: ProviderLedgerEntrySchema.nullable().optional(),
    public_file_url: z.string().nullable().optional(),
    filename: z.string().nullable().optional(),
    remaining_amount_with_tax: z.string().nullable().optional(),
    remaining_amount_without_tax: z.string().nullable().optional(),
    draft: z.boolean(),
    special_mention: z.string().nullable().optional(),
    customer: ProviderCustomerSchema.nullable().optional(),
    invoice_line_sections: ProviderInvoiceUrlCollectionSchema,
    invoice_lines: ProviderInvoiceUrlCollectionSchema,
    custom_header_fields: ProviderInvoiceUrlCollectionSchema,
    categories: ProviderInvoiceUrlCollectionSchema,
    pdf_invoice_free_text: z.string().nullable().optional(),
    pdf_invoice_subject: z.string().nullable().optional(),
    pdf_description: z.string().nullable().optional(),
    billing_subscription: ProviderBillingSubscriptionSchema.nullable().optional(),
    credited_invoice: ProviderCreditedInvoiceSchema.nullable().optional(),
    customer_invoice_template: ProviderCustomerInvoiceTemplateSchema.nullable().optional(),
    transaction_reference: ProviderTransactionReferenceSchema.nullable().optional(),
    payments: ProviderInvoiceUrlCollectionSchema,
    matched_transactions: ProviderInvoiceUrlCollectionSchema,
    appendices: ProviderInvoiceUrlCollectionSchema,
    quote: z
        .object({
            id: z.number()
        })
        .nullable()
        .optional(),
    external_reference: z.string(),
    e_invoicing: ProviderEInvoicingSchema.nullable().optional(),
    factur_x: z.boolean(),
    archived_at: z.string().nullable().optional(),
    created_at: z.string(),
    updated_at: z.string()
});

const OutputSchema = z.object({
    id: z.number().describe('Invoice identifier'),
    label: z.string().optional().describe('Invoice label'),
    invoice_number: z.string().describe('Invoice number'),
    currency: z.string().describe('Invoice currency'),
    amount: z.string().describe('Invoice amount in euros'),
    currency_amount: z.string().describe('Invoice amount in the currency of the invoice'),
    currency_amount_before_tax: z.string().describe('Invoice amount before tax in the currency of the invoice'),
    exchange_rate: z.string().describe('Exchange rate used to convert the invoice to euros'),
    date: z.string().optional().describe('Invoice issue date (ISO 8601)'),
    deadline: z.string().optional().describe('Invoice payment deadline (ISO 8601)'),
    currency_tax: z.string().describe('Invoice taxable amount in invoice currency'),
    tax: z.string().describe('Invoice taxable amount in euros'),
    language: z.string().describe('Invoice language'),
    paid: z.boolean().describe('Invoice paid status'),
    status: z.string().describe('Invoice status'),
    draft: z.boolean().describe('Indicates if the invoice is in draft'),
    special_mention: z.string().optional().describe('Additional details'),
    discount: z
        .object({
            type: z.union([z.literal('absolute'), z.literal('relative')]),
            value: z.string()
        })
        .optional()
        .describe('Discount details'),
    ledger_entry: z
        .object({
            id: z.number()
        })
        .optional()
        .describe('Ledger entry identifier'),
    public_file_url: z.string().optional().describe('Public URL of the invoice file'),
    filename: z.string().optional().describe('Name of the file attached to the invoice'),
    remaining_amount_with_tax: z.string().optional().describe('The remaining amount with VAT to pay'),
    remaining_amount_without_tax: z.string().optional().describe('The remaining amount without VAT to pay'),
    customer: z
        .object({
            id: z.number(),
            url: z.string()
        })
        .optional()
        .describe('Customer associated with the invoice'),
    invoice_line_sections: z
        .object({
            url: z.string()
        })
        .describe('URL to get the invoice line sections'),
    invoice_lines: z
        .object({
            url: z.string()
        })
        .describe('URL to get the invoice lines'),
    custom_header_fields: z
        .object({
            url: z.string()
        })
        .describe('URL to get the custom header fields'),
    categories: z
        .object({
            url: z.string()
        })
        .describe('URL to get the categories'),
    pdf_invoice_free_text: z.string().optional().describe('Free text on the PDF invoice'),
    pdf_invoice_subject: z.string().optional().describe('Subject on the PDF invoice'),
    pdf_description: z.string().optional().describe('Description on the PDF invoice'),
    billing_subscription: z
        .object({
            id: z.number()
        })
        .optional()
        .describe('Billing subscription associated with the invoice'),
    credited_invoice: z
        .object({
            id: z.number(),
            url: z.string()
        })
        .optional()
        .describe('The credited invoice if the invoice is a credit note'),
    customer_invoice_template: z
        .object({
            id: z.number()
        })
        .optional()
        .describe('Customer invoice template used'),
    transaction_reference: z
        .object({
            banking_provider: z.string(),
            provider_field_name: z.string(),
            provider_field_value: z.string()
        })
        .optional()
        .describe('Transaction reference for automatic payment matching'),
    payments: z
        .object({
            url: z.string()
        })
        .describe('URL to get the payments'),
    matched_transactions: z
        .object({
            url: z.string()
        })
        .describe('URL to get the matched transactions'),
    appendices: z
        .object({
            url: z.string()
        })
        .describe('URL to get the appendices'),
    quote: z
        .object({
            id: z.number()
        })
        .optional()
        .describe('The quote at the origin of the invoice'),
    external_reference: z.string().describe('The unique external reference assigned during creation'),
    e_invoicing: z
        .object({
            status: z.string(),
            reason: z.string().optional(),
            flow: z
                .object({
                    id: z.string()
                })
                .optional()
        })
        .optional()
        .describe('E-invoicing lifecycle information'),
    factur_x: z.boolean().describe('Whether the attached invoice file is a Factur-X document'),
    archived_at: z.string().optional().describe('The time the invoice has been archived'),
    created_at: z.string().describe('The time the invoice has been created'),
    updated_at: z.string().describe('The last time the invoice has been updated')
});

const action = createAction({
    description: 'Create a customer invoice from an existing quote',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['customer_invoices:all'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {
            quote_id: input.quote_id,
            draft: input.draft
        };

        if (input.external_reference !== undefined) {
            body['external_reference'] = input.external_reference;
        }

        if (input.customer_invoice_template_id !== undefined) {
            body['customer_invoice_template_id'] = input.customer_invoice_template_id;
        }

        const config: ProxyConfiguration = {
            // https://pennylane.readme.io/reference/createcustomerinvoicefromquote
            endpoint: '/api/external/v2/customer_invoices/create_from_quote',
            data: body,
            retries: 3
        };

        const response = await nango.post(config);

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid or empty response from provider'
            });
        }

        const providerInvoice = ProviderCustomerInvoiceSchema.parse(response.data);

        return {
            id: providerInvoice.id,
            ...(providerInvoice.label != null && { label: providerInvoice.label }),
            invoice_number: providerInvoice.invoice_number,
            currency: providerInvoice.currency,
            amount: providerInvoice.amount,
            currency_amount: providerInvoice.currency_amount,
            currency_amount_before_tax: providerInvoice.currency_amount_before_tax,
            exchange_rate: providerInvoice.exchange_rate,
            ...(providerInvoice.date != null && { date: providerInvoice.date }),
            ...(providerInvoice.deadline != null && { deadline: providerInvoice.deadline }),
            currency_tax: providerInvoice.currency_tax,
            tax: providerInvoice.tax,
            language: providerInvoice.language,
            paid: providerInvoice.paid,
            status: providerInvoice.status,
            draft: providerInvoice.draft,
            ...(providerInvoice.special_mention != null && { special_mention: providerInvoice.special_mention }),
            ...(providerInvoice.discount != null && {
                discount: {
                    type: providerInvoice.discount.type,
                    value: providerInvoice.discount.value
                }
            }),
            ...(providerInvoice.ledger_entry != null && { ledger_entry: { id: providerInvoice.ledger_entry.id } }),
            ...(providerInvoice.public_file_url != null && { public_file_url: providerInvoice.public_file_url }),
            ...(providerInvoice.filename != null && { filename: providerInvoice.filename }),
            ...(providerInvoice.remaining_amount_with_tax != null && { remaining_amount_with_tax: providerInvoice.remaining_amount_with_tax }),
            ...(providerInvoice.remaining_amount_without_tax != null && { remaining_amount_without_tax: providerInvoice.remaining_amount_without_tax }),
            ...(providerInvoice.customer != null && { customer: { id: providerInvoice.customer.id, url: providerInvoice.customer.url } }),
            invoice_line_sections: { url: providerInvoice.invoice_line_sections.url },
            invoice_lines: { url: providerInvoice.invoice_lines.url },
            custom_header_fields: { url: providerInvoice.custom_header_fields.url },
            categories: { url: providerInvoice.categories.url },
            ...(providerInvoice.pdf_invoice_free_text != null && { pdf_invoice_free_text: providerInvoice.pdf_invoice_free_text }),
            ...(providerInvoice.pdf_invoice_subject != null && { pdf_invoice_subject: providerInvoice.pdf_invoice_subject }),
            ...(providerInvoice.pdf_description != null && { pdf_description: providerInvoice.pdf_description }),
            ...(providerInvoice.billing_subscription != null && { billing_subscription: { id: providerInvoice.billing_subscription.id } }),
            ...(providerInvoice.credited_invoice != null && {
                credited_invoice: { id: providerInvoice.credited_invoice.id, url: providerInvoice.credited_invoice.url }
            }),
            ...(providerInvoice.customer_invoice_template != null && { customer_invoice_template: { id: providerInvoice.customer_invoice_template.id } }),
            ...(providerInvoice.transaction_reference != null && {
                transaction_reference: {
                    banking_provider: providerInvoice.transaction_reference.banking_provider,
                    provider_field_name: providerInvoice.transaction_reference.provider_field_name,
                    provider_field_value: providerInvoice.transaction_reference.provider_field_value
                }
            }),
            payments: { url: providerInvoice.payments.url },
            matched_transactions: { url: providerInvoice.matched_transactions.url },
            appendices: { url: providerInvoice.appendices.url },
            ...(providerInvoice.quote != null && { quote: { id: providerInvoice.quote.id } }),
            external_reference: providerInvoice.external_reference,
            ...(providerInvoice.e_invoicing != null && {
                e_invoicing: {
                    status: providerInvoice.e_invoicing.status,
                    ...(providerInvoice.e_invoicing.reason != null && { reason: providerInvoice.e_invoicing.reason }),
                    ...(providerInvoice.e_invoicing.flow != null && { flow: { id: providerInvoice.e_invoicing.flow.id } })
                }
            }),
            factur_x: providerInvoice.factur_x,
            ...(providerInvoice.archived_at != null && { archived_at: providerInvoice.archived_at }),
            created_at: providerInvoice.created_at,
            updated_at: providerInvoice.updated_at
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
