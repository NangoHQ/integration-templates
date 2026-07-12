import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('Quote ID. Example: 25461979840512'),
    status: z.enum(['pending', 'accepted', 'denied', 'invoiced', 'expired']).describe('New quote status.')
});

const ProviderQuoteSchema = z.object({
    id: z.number(),
    label: z.string().nullable().optional(),
    quote_number: z.string().optional(),
    currency: z.string().optional(),
    amount: z.string().optional(),
    currency_amount: z.string().optional(),
    currency_amount_before_tax: z.string().optional(),
    exchange_rate: z.string().optional(),
    date: z.string().nullable().optional(),
    deadline: z.string().nullable().optional(),
    currency_tax: z.string().optional(),
    tax: z.string().optional(),
    language: z.string().optional(),
    status: z.enum(['pending', 'accepted', 'denied', 'invoiced', 'expired']).optional(),
    discount: z
        .object({
            type: z.enum(['absolute', 'relative']).optional(),
            value: z.string().optional()
        })
        .optional(),
    public_file_url: z.string().nullable().optional(),
    filename: z.string().nullable().optional(),
    special_mention: z.string().nullable().optional(),
    customer: z
        .object({
            id: z.number().optional(),
            url: z.string().optional()
        })
        .nullable()
        .optional(),
    invoice_line_sections: z
        .object({
            url: z.string().optional()
        })
        .optional(),
    invoice_lines: z
        .object({
            url: z.string().optional()
        })
        .optional(),
    linked_invoices: z
        .object({
            url: z.string().optional()
        })
        .optional(),
    pdf_invoice_free_text: z.string().optional(),
    pdf_invoice_subject: z.string().optional(),
    pdf_description: z.string().nullable().optional(),
    quote_template: z
        .object({
            id: z.number().optional()
        })
        .nullable()
        .optional(),
    appendices: z
        .object({
            url: z.string().optional()
        })
        .optional(),
    external_reference: z.string().optional(),
    archived_at: z.string().nullable().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const OutputSchema = ProviderQuoteSchema;

const action = createAction({
    description: 'Update the status of a quote.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['quotes:all'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://pennylane.readme.io/reference/updatestatusquote.md
            endpoint: `/api/external/v2/quotes/${encodeURIComponent(String(input.id))}/update_status`,
            data: {
                status: input.status
            },
            retries: 3
        });

        const quote = ProviderQuoteSchema.parse(response.data);
        return quote;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
