import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Customer invoice or credit note ID. Example: "25461646082048"')
});

const DiscountSchema = z
    .object({
        type: z.string(),
        value: z.string()
    })
    .passthrough();

const CustomerSchema = z
    .object({
        id: z.union([z.string(), z.number()]),
        url: z.string()
    })
    .passthrough();

const LedgerEntrySchema = z
    .object({
        id: z.union([z.string(), z.number()])
    })
    .passthrough();

const UrlResourceSchema = z
    .object({
        url: z.string()
    })
    .passthrough();

const OutputSchema = z
    .object({
        id: z.union([z.string(), z.number()]),
        label: z.union([z.string(), z.null()]).optional(),
        invoice_number: z.union([z.string(), z.null()]).optional(),
        currency: z.string().optional(),
        amount: z.string().optional(),
        currency_amount: z.string().optional(),
        currency_amount_before_tax: z.string().optional(),
        tax: z.string().optional(),
        currency_tax: z.string().optional(),
        remaining_amount_with_tax: z.union([z.string(), z.null()]).optional(),
        remaining_amount_without_tax: z.union([z.string(), z.null()]).optional(),
        draft: z.boolean().optional(),
        language: z.string().optional(),
        paid: z.boolean().optional(),
        status: z.string().optional(),
        filename: z.string().nullable().optional(),
        date: z.string().nullable().optional(),
        deadline: z.string().nullable().optional(),
        special_mention: z.union([z.string(), z.null()]).optional(),
        created_at: z.string().optional(),
        updated_at: z.string().optional(),
        archived_at: z.union([z.string(), z.null()]).optional(),
        pdf_invoice_free_text: z.string().optional(),
        pdf_description: z.union([z.string(), z.null()]).optional(),
        pdf_invoice_subject: z.string().optional(),
        public_file_url: z.string().nullable().optional(),
        exchange_rate: z.string().optional(),
        discount: DiscountSchema.nullable().optional(),
        ledger_entry: LedgerEntrySchema.nullable().optional(),
        customer_invoice_template: z.union([z.object({}).passthrough(), z.null()]).optional(),
        transaction_reference: z.union([z.object({}).passthrough(), z.null()]).optional(),
        customer: CustomerSchema.nullable().optional(),
        billing_subscription: z.union([z.object({}).passthrough(), z.null()]).optional(),
        credited_invoice: z.union([z.object({}).passthrough(), z.null()]).optional(),
        quote: z.union([z.object({}).passthrough(), z.null()]).optional(),
        invoice_line_sections: UrlResourceSchema.nullable().optional(),
        invoice_lines: UrlResourceSchema.nullable().optional(),
        custom_header_fields: UrlResourceSchema.nullable().optional(),
        categories: UrlResourceSchema.nullable().optional(),
        payments: UrlResourceSchema.nullable().optional(),
        matched_transactions: UrlResourceSchema.nullable().optional(),
        appendices: UrlResourceSchema.nullable().optional(),
        external_reference: z.string().optional(),
        e_invoicing: z.object({}).passthrough().nullable().optional(),
        factur_x: z.boolean().optional()
    })
    .passthrough();

const action = createAction({
    description: 'Retrieve a customer invoice or credit note.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['customer_invoices:readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://pennylane.readme.io/reference/getcustomerinvoice
            endpoint: `/api/external/v2/customer_invoices/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Customer invoice not found',
                id: input.id
            });
        }

        const parsed = OutputSchema.parse(response.data);
        return parsed;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
