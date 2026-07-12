import { z } from 'zod';
import { createAction } from 'nango';

const ListInputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().min(1).max(100).optional().describe('Number of items to return per request. Defaults to 20 if not specified. Must be between 1 and 100.'),
    filter: z.string().optional().describe('Filter string for specific fields.'),
    sort: z.string().optional().describe('Sort field. Defaults to -id.')
});

const ProviderQuoteSchema = z.object({
    id: z.number(),
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
    language: z.string(),
    status: z.string(),
    discount: z.object({
        type: z.string(),
        value: z.string()
    }),
    public_file_url: z.string().nullable(),
    filename: z.string().nullable(),
    special_mention: z.string().nullable(),
    customer: z
        .object({
            id: z.number(),
            url: z.string()
        })
        .nullable(),
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
    pdf_description: z.string().nullable(),
    quote_template: z
        .object({
            id: z.number()
        })
        .nullable(),
    appendices: z.object({
        url: z.string()
    }),
    external_reference: z.string(),
    archived_at: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string()
});

const QuoteSchema = z.object({
    id: z.number(),
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
    language: z.string(),
    status: z.string(),
    discount: z.object({
        type: z.string(),
        value: z.string()
    }),
    public_file_url: z.string().optional(),
    filename: z.string().optional(),
    special_mention: z.string().optional(),
    customer: z
        .object({
            id: z.number(),
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
            id: z.number()
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

const ListOutputSchema = z.object({
    items: z.array(QuoteSchema),
    has_more: z.boolean(),
    next_cursor: z.string().optional()
});

function mapQuote(quote: z.infer<typeof ProviderQuoteSchema>): z.infer<typeof QuoteSchema> {
    return {
        id: quote.id,
        ...(quote.label != null && { label: quote.label }),
        quote_number: quote.quote_number,
        currency: quote.currency,
        amount: quote.amount,
        currency_amount: quote.currency_amount,
        currency_amount_before_tax: quote.currency_amount_before_tax,
        exchange_rate: quote.exchange_rate,
        ...(quote.date != null && { date: quote.date }),
        ...(quote.deadline != null && { deadline: quote.deadline }),
        currency_tax: quote.currency_tax,
        tax: quote.tax,
        language: quote.language,
        status: quote.status,
        discount: quote.discount,
        ...(quote.public_file_url != null && { public_file_url: quote.public_file_url }),
        ...(quote.filename != null && { filename: quote.filename }),
        ...(quote.special_mention != null && { special_mention: quote.special_mention }),
        ...(quote.customer != null && { customer: quote.customer }),
        invoice_line_sections: quote.invoice_line_sections,
        invoice_lines: quote.invoice_lines,
        linked_invoices: quote.linked_invoices,
        pdf_invoice_free_text: quote.pdf_invoice_free_text,
        pdf_invoice_subject: quote.pdf_invoice_subject,
        ...(quote.pdf_description != null && { pdf_description: quote.pdf_description }),
        ...(quote.quote_template != null && { quote_template: quote.quote_template }),
        appendices: quote.appendices,
        external_reference: quote.external_reference,
        ...(quote.archived_at != null && { archived_at: quote.archived_at }),
        created_at: quote.created_at,
        updated_at: quote.updated_at
    };
}

const action = createAction({
    description: 'List quotes.',
    version: '1.0.0',
    input: ListInputSchema,
    output: ListOutputSchema,
    scopes: ['quotes:all', 'quotes:readonly'],

    exec: async (nango, input): Promise<z.infer<typeof ListOutputSchema>> => {
        const response = await nango.get({
            // https://pennylane.readme.io/reference/listquotes
            endpoint: '/api/external/v2/quotes',
            params: {
                ...(input.cursor !== undefined && { cursor: input.cursor }),
                ...(input.limit !== undefined && { limit: String(input.limit) }),
                ...(input.filter !== undefined && { filter: input.filter }),
                ...(input.sort !== undefined && { sort: input.sort })
            },
            retries: 3
        });

        const providerList = z
            .object({
                has_more: z.boolean(),
                next_cursor: z.string().nullable(),
                items: z.array(ProviderQuoteSchema)
            })
            .parse(response.data);

        return {
            items: providerList.items.map((quote) => mapQuote(quote)),
            has_more: providerList.has_more,
            ...(providerList.next_cursor != null && { next_cursor: providerList.next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
