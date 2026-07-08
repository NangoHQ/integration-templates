import { z } from 'zod';
import { createAction } from 'nango';

const InvoiceLineInputSchema = z.object({
    product_id: z.number().describe('The product ID. Example: 87538491392'),
    quantity: z.number().describe('Line item quantity. Example: 2'),
    raw_currency_unit_price: z
        .string()
        .optional()
        .describe('The unit price excluding taxes, as a string with up to 6 decimals. Overrides the product price when provided. Example: "500.00"'),
    label: z.string().optional().describe('Line item label'),
    ledger_account_id: z.number().optional().describe('The ledger account ID'),
    unit: z.string().optional().describe('Line item unit'),
    vat_rate: z.string().optional().describe('Product VAT rate. Example: FR_200'),
    description: z.string().nullable().optional().describe('The description of the invoice line'),
    section_rank: z.number().optional().describe('Section rank'),
    discount: z
        .object({
            type: z.enum(['absolute', 'relative']),
            value: z.string()
        })
        .optional()
});

const InputSchema = z.object({
    customer_id: z.number().describe('Customer identifier. Example: 1338468995072'),
    date: z.string().describe('Quote date (ISO 8601). Example: 2026-07-08'),
    deadline: z.string().describe('Quote validity deadline (ISO 8601). Example: 2026-07-15'),
    invoice_lines: z.array(InvoiceLineInputSchema).describe('Array of invoice lines referencing existing products'),
    currency: z.string().optional().describe('Currency code. Defaults to EUR. Example: EUR'),
    quote_template_id: z.number().optional().describe('The quote template ID. Example: 42'),
    pdf_invoice_free_text: z.string().nullable().optional().describe('Free text field. Example: Additional free field'),
    pdf_invoice_subject: z.string().nullable().optional().describe('Quote title. Example: Invoice title'),
    pdf_description: z.string().nullable().optional().describe('Quote description. Example: Invoice description'),
    special_mention: z.string().nullable().optional().describe('Additional details. Example: Additional details'),
    language: z.string().optional().describe('Language code. Example: fr_FR'),
    external_reference: z.string().optional().describe('A unique external reference. Example: FR123'),
    discount: z
        .object({
            type: z.enum(['absolute', 'relative']),
            value: z.string()
        })
        .optional()
});

const CustomerSchema = z.object({
    id: z.number(),
    url: z.string()
});

const UrlResourceSchema = z.object({
    url: z.string()
});

const DiscountSchema = z.object({
    type: z.string(),
    value: z.string()
});

const OutputSchema = z.object({
    id: z.number().describe('Quote identifier'),
    quote_number: z.string().describe('Quote number'),
    date: z.string().nullable().optional().describe('Quote issue date'),
    deadline: z.string().nullable().optional().describe('Quote expiration deadline'),
    currency: z.string().optional().describe('Quote currency'),
    amount: z.string().optional().describe('Quote amount in euros'),
    currency_amount: z.string().optional().describe('Quote amount in quote currency'),
    currency_amount_before_tax: z.string().optional().describe('Quote amount before tax in quote currency'),
    exchange_rate: z.string().optional().describe('Quote exchange rate'),
    currency_tax: z.string().optional().describe('Quote taxable amount in quote currency'),
    tax: z.string().optional().describe('Quote taxable amount in euros'),
    language: z.string().optional().describe('Quote language'),
    status: z.string().optional().describe('Quote status'),
    label: z.string().nullable().optional().describe('Quote label'),
    special_mention: z.string().nullable().optional().describe('Additional details'),
    public_file_url: z.string().nullable().optional().describe('Public URL of the quote file'),
    filename: z.string().nullable().optional().describe('Name of the file attached to the quote'),
    pdf_invoice_free_text: z.string().optional().describe('PDF free text'),
    pdf_invoice_subject: z.string().optional().describe('PDF subject'),
    pdf_description: z.string().nullable().optional().describe('PDF description'),
    customer: CustomerSchema.nullable().optional(),
    invoice_lines: UrlResourceSchema.optional(),
    invoice_line_sections: UrlResourceSchema.optional(),
    linked_invoices: UrlResourceSchema.optional(),
    discount: DiscountSchema.optional()
});

const action = createAction({
    description: 'Create a quote.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['quotes:all'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const invoiceLines = input.invoice_lines.map((line) => {
            const mappedLine: Record<string, unknown> = {
                product_id: line.product_id,
                quantity: line.quantity
            };

            if (line.raw_currency_unit_price !== undefined) {
                mappedLine['raw_currency_unit_price'] = line.raw_currency_unit_price;
            }
            if (line.label !== undefined) {
                mappedLine['label'] = line.label;
            }
            if (line.ledger_account_id !== undefined) {
                mappedLine['ledger_account_id'] = line.ledger_account_id;
            }
            if (line.unit !== undefined) {
                mappedLine['unit'] = line.unit;
            }
            if (line.vat_rate !== undefined) {
                mappedLine['vat_rate'] = line.vat_rate;
            }
            if (line.description !== undefined) {
                mappedLine['description'] = line.description;
            }
            if (line.section_rank !== undefined) {
                mappedLine['section_rank'] = line.section_rank;
            }
            if (line.discount !== undefined) {
                mappedLine['discount'] = line.discount;
            }

            return mappedLine;
        });

        const payload: Record<string, unknown> = {
            customer_id: input.customer_id,
            date: input.date,
            deadline: input.deadline,
            invoice_lines: invoiceLines
        };

        if (input.currency !== undefined) {
            payload['currency'] = input.currency;
        }
        if (input.quote_template_id !== undefined) {
            payload['quote_template_id'] = input.quote_template_id;
        }
        if (input.pdf_invoice_free_text !== undefined) {
            payload['pdf_invoice_free_text'] = input.pdf_invoice_free_text;
        }
        if (input.pdf_invoice_subject !== undefined) {
            payload['pdf_invoice_subject'] = input.pdf_invoice_subject;
        }
        if (input.pdf_description !== undefined) {
            payload['pdf_description'] = input.pdf_description;
        }
        if (input.special_mention !== undefined) {
            payload['special_mention'] = input.special_mention;
        }
        if (input.language !== undefined) {
            payload['language'] = input.language;
        }
        if (input.external_reference !== undefined) {
            payload['external_reference'] = input.external_reference;
        }
        if (input.discount !== undefined) {
            payload['discount'] = input.discount;
        }

        const response = await nango.post({
            // https://pennylane.readme.io/reference/postquotes
            endpoint: '/api/external/v2/quotes',
            data: payload,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'empty_response',
                message: 'Received empty response from Pennylane API'
            });
        }

        const quote = OutputSchema.parse(response.data);

        return {
            id: quote.id,
            quote_number: quote.quote_number,
            ...(quote.date != null && { date: quote.date }),
            ...(quote.deadline != null && { deadline: quote.deadline }),
            ...(quote.currency !== undefined && { currency: quote.currency }),
            ...(quote.amount !== undefined && { amount: quote.amount }),
            ...(quote.currency_amount !== undefined && { currency_amount: quote.currency_amount }),
            ...(quote.currency_amount_before_tax !== undefined && { currency_amount_before_tax: quote.currency_amount_before_tax }),
            ...(quote.exchange_rate !== undefined && { exchange_rate: quote.exchange_rate }),
            ...(quote.currency_tax !== undefined && { currency_tax: quote.currency_tax }),
            ...(quote.tax !== undefined && { tax: quote.tax }),
            ...(quote.language !== undefined && { language: quote.language }),
            ...(quote.status !== undefined && { status: quote.status }),
            ...(quote.label != null && { label: quote.label }),
            ...(quote.special_mention != null && { special_mention: quote.special_mention }),
            ...(quote.public_file_url != null && { public_file_url: quote.public_file_url }),
            ...(quote.filename != null && { filename: quote.filename }),
            ...(quote.pdf_invoice_free_text !== undefined && { pdf_invoice_free_text: quote.pdf_invoice_free_text }),
            ...(quote.pdf_invoice_subject !== undefined && { pdf_invoice_subject: quote.pdf_invoice_subject }),
            ...(quote.pdf_description != null && { pdf_description: quote.pdf_description }),
            ...(quote.customer != null && { customer: quote.customer }),
            ...(quote.invoice_lines !== undefined && { invoice_lines: quote.invoice_lines }),
            ...(quote.invoice_line_sections !== undefined && { invoice_line_sections: quote.invoice_line_sections }),
            ...(quote.linked_invoices !== undefined && { linked_invoices: quote.linked_invoices }),
            ...(quote.discount !== undefined && { discount: quote.discount })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
