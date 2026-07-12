import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().min(1).max(100).optional().describe('Number of items to return per request. Defaults to 20. Must be between 1 and 100.'),
    filter: z.string().optional().describe('Filter JSON array string. Example: [{"field":"credit_note","operator":"eq","value":"true"}]'),
    sort: z.string().optional().describe('Sort field, optionally prefixed with - for descending. Available fields: id, date. Default: -id'),
    include: z.string().optional().describe('Additional related resources to include. Available: invoice_lines')
});

const CustomerInvoiceSchema = z
    .object({
        id: z.number(),
        label: z.string().nullable().optional(),
        invoice_number: z.string().nullable().optional(),
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
        paid: z.boolean().optional(),
        status: z.string().optional(),
        discount: z
            .object({
                type: z.string(),
                value: z.string()
            })
            .nullable()
            .optional(),
        ledger_entry: z
            .object({
                id: z.number()
            })
            .nullable()
            .optional(),
        public_file_url: z.string().nullable().optional(),
        filename: z.string().nullable().optional(),
        remaining_amount_with_tax: z.string().nullable().optional(),
        remaining_amount_without_tax: z.string().nullable().optional(),
        draft: z.boolean().optional(),
        special_mention: z.string().nullable().optional(),
        customer: z
            .object({
                id: z.number(),
                url: z.string()
            })
            .nullable()
            .optional(),
        invoice_line_sections: z
            .object({
                url: z.string()
            })
            .optional(),
        invoice_lines: z
            .object({
                url: z.string()
            })
            .optional(),
        custom_header_fields: z
            .object({
                url: z.string()
            })
            .optional(),
        categories: z
            .object({
                url: z.string()
            })
            .optional(),
        pdf_invoice_free_text: z.string().optional(),
        pdf_invoice_subject: z.string().optional(),
        pdf_description: z.string().nullable().optional(),
        billing_subscription: z
            .object({
                id: z.number()
            })
            .nullable()
            .optional(),
        credited_invoice: z
            .object({
                id: z.number(),
                url: z.string()
            })
            .nullable()
            .optional(),
        customer_invoice_template: z
            .object({
                id: z.number()
            })
            .nullable()
            .optional(),
        transaction_reference: z
            .object({
                banking_provider: z.string(),
                provider_field_name: z.string(),
                provider_field_value: z.string()
            })
            .nullable()
            .optional(),
        payments: z
            .object({
                url: z.string()
            })
            .optional(),
        matched_transactions: z
            .object({
                url: z.string()
            })
            .optional(),
        appendices: z
            .object({
                url: z.string()
            })
            .optional(),
        quote: z
            .object({
                id: z.number()
            })
            .nullable()
            .optional(),
        external_reference: z.string().optional(),
        e_invoicing: z
            .object({
                status: z.string(),
                reason: z.string().nullable().optional(),
                flow: z
                    .object({
                        id: z.string()
                    })
                    .nullable()
                    .optional()
            })
            .nullable()
            .optional(),
        factur_x: z.boolean().optional(),
        archived_at: z.string().nullable().optional(),
        created_at: z.string().optional(),
        updated_at: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(CustomerInvoiceSchema),
    has_more: z.boolean(),
    next_cursor: z.string().nullable(),
    included: z.record(z.string(), z.unknown()).optional()
});

const action = createAction({
    description: 'List customer invoices and credit notes.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['customer_invoices:readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {};

        if (input.cursor !== undefined) {
            params['cursor'] = input.cursor;
        }

        if (input.limit !== undefined) {
            params['limit'] = input.limit;
        }

        if (input.filter !== undefined) {
            params['filter'] = input.filter;
        }

        if (input.sort !== undefined) {
            params['sort'] = input.sort;
        }

        if (input.include !== undefined) {
            params['include'] = input.include;
        }

        const response = await nango.get({
            // https://pennylane.readme.io/reference/getcustomerinvoices
            endpoint: '/api/external/v2/customer_invoices',
            params,
            retries: 3
        });

        const ListResponseSchema = z.object({
            items: z.array(z.unknown()),
            has_more: z.boolean(),
            next_cursor: z.string().nullable(),
            included: z.record(z.string(), z.unknown()).optional()
        });

        const parsed = ListResponseSchema.parse(response.data);

        const items = parsed.items.map((item) => CustomerInvoiceSchema.parse(item));

        return {
            items,
            has_more: parsed.has_more,
            next_cursor: parsed.next_cursor,
            ...(parsed.included !== undefined && { included: parsed.included })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
