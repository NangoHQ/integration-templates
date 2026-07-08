import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().int().describe('Quote ID. Example: 25461979840512')
});

const ProviderDiscountSchema = z.object({
    type: z.enum(['absolute', 'relative']),
    value: z.string()
});

const ProviderCustomerSchema = z.object({
    id: z.number().int(),
    url: z.string()
});

const ProviderInvoiceLineSectionsSchema = z.object({
    url: z.string()
});

const ProviderInvoiceLinesSchema = z.object({
    url: z.string()
});

const ProviderLinkedInvoicesSchema = z.object({
    url: z.string()
});

const ProviderQuoteTemplateSchema = z.object({
    id: z.number().int()
});

const ProviderAppendicesSchema = z.object({
    url: z.string()
});

const ProviderQuoteSchema = z.object({
    id: z.number().int(),
    label: z.string().nullable(),
    quote_number: z.string(),
    currency: z.string(),
    amount: z.string(),
    currency_amount: z.string(),
    currency_amount_before_tax: z.string(),
    exchange_rate: z.string(),
    date: z.string().nullable(),
    deadline: z.string().nullable(),
    currency_tax: z.string(),
    tax: z.string(),
    language: z.enum(['fr_FR', 'en_GB', 'de_DE']),
    status: z.enum(['pending', 'accepted', 'denied', 'invoiced', 'expired']),
    discount: ProviderDiscountSchema,
    public_file_url: z.string().nullable(),
    filename: z.string().nullable(),
    special_mention: z.string().nullable(),
    customer: ProviderCustomerSchema.nullable(),
    invoice_line_sections: ProviderInvoiceLineSectionsSchema,
    invoice_lines: ProviderInvoiceLinesSchema,
    linked_invoices: ProviderLinkedInvoicesSchema,
    pdf_invoice_free_text: z.string(),
    pdf_invoice_subject: z.string(),
    pdf_description: z.string().nullable(),
    quote_template: ProviderQuoteTemplateSchema.nullable(),
    appendices: ProviderAppendicesSchema,
    external_reference: z.string(),
    archived_at: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string()
});

const OutputSchema = z.object({
    id: z.number().int(),
    label: z.string().optional(),
    quote_number: z.string(),
    currency: z.string(),
    amount: z.string(),
    currency_amount: z.string(),
    currency_amount_before_tax: z.string(),
    exchange_rate: z.string(),
    date: z.string().optional(),
    deadline: z.string().optional(),
    currency_tax: z.string(),
    tax: z.string(),
    language: z.enum(['fr_FR', 'en_GB', 'de_DE']),
    status: z.enum(['pending', 'accepted', 'denied', 'invoiced', 'expired']),
    discount: z.object({
        type: z.enum(['absolute', 'relative']),
        value: z.string()
    }),
    public_file_url: z.string().optional(),
    filename: z.string().optional(),
    special_mention: z.string().optional(),
    customer: z
        .object({
            id: z.number().int(),
            url: z.string()
        })
        .optional(),
    invoice_line_sections: z.object({
        url: z.string()
    }),
    invoice_lines: z.object({
        url: z.string()
    }),
    linked_invoices: z.object({
        url: z.string()
    }),
    pdf_invoice_free_text: z.string(),
    pdf_invoice_subject: z.string(),
    pdf_description: z.string().optional(),
    quote_template: z
        .object({
            id: z.number().int()
        })
        .optional(),
    appendices: z.object({
        url: z.string()
    }),
    external_reference: z.string(),
    archived_at: z.string().optional(),
    created_at: z.string(),
    updated_at: z.string()
});

const action = createAction({
    description: 'Retrieve a quote.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['quotes:readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://pennylane.readme.io/reference/getquote
            endpoint: `/api/external/v2/quotes/${encodeURIComponent(String(input.id))}`,
            retries: 3
        });

        const providerQuote = ProviderQuoteSchema.parse(response.data);

        return {
            id: providerQuote.id,
            ...(providerQuote.label != null && { label: providerQuote.label }),
            quote_number: providerQuote.quote_number,
            currency: providerQuote.currency,
            amount: providerQuote.amount,
            currency_amount: providerQuote.currency_amount,
            currency_amount_before_tax: providerQuote.currency_amount_before_tax,
            exchange_rate: providerQuote.exchange_rate,
            ...(providerQuote.date != null && { date: providerQuote.date }),
            ...(providerQuote.deadline != null && { deadline: providerQuote.deadline }),
            currency_tax: providerQuote.currency_tax,
            tax: providerQuote.tax,
            language: providerQuote.language,
            status: providerQuote.status,
            discount: providerQuote.discount,
            ...(providerQuote.public_file_url != null && { public_file_url: providerQuote.public_file_url }),
            ...(providerQuote.filename != null && { filename: providerQuote.filename }),
            ...(providerQuote.special_mention != null && { special_mention: providerQuote.special_mention }),
            ...(providerQuote.customer != null && { customer: providerQuote.customer }),
            invoice_line_sections: providerQuote.invoice_line_sections,
            invoice_lines: providerQuote.invoice_lines,
            linked_invoices: providerQuote.linked_invoices,
            pdf_invoice_free_text: providerQuote.pdf_invoice_free_text,
            pdf_invoice_subject: providerQuote.pdf_invoice_subject,
            ...(providerQuote.pdf_description != null && { pdf_description: providerQuote.pdf_description }),
            ...(providerQuote.quote_template != null && { quote_template: providerQuote.quote_template }),
            appendices: providerQuote.appendices,
            external_reference: providerQuote.external_reference,
            ...(providerQuote.archived_at != null && { archived_at: providerQuote.archived_at }),
            created_at: providerQuote.created_at,
            updated_at: providerQuote.updated_at
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
