import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    invoiceId: z.string().describe('Invoice ID. Example: "453877"'),
    customerid: z.union([z.string(), z.number()]).optional().describe('Client ID to associate with the invoice.'),
    create_date: z.string().optional().describe('Creation date in YYYY-MM-DD format.'),
    due_date: z.string().optional().describe('Due date in YYYY-MM-DD format.'),
    description: z.string().optional().describe('Invoice description or title.'),
    terms: z.string().optional().describe('Payment terms.'),
    notes: z.string().optional().describe('Notes visible to the client.'),
    po_number: z.string().optional().describe('Purchase order number.'),
    discount_value: z.union([z.string(), z.number()]).optional().describe('Discount value.'),
    discount_description: z.string().optional().describe('Discount description.'),
    deposit_amount: z.union([z.string(), z.number()]).optional().describe('Deposit amount.'),
    deposit_percent: z.union([z.string(), z.number()]).optional().describe('Deposit percentage.'),
    deposit_type: z.string().optional().describe('Deposit type.'),
    invoice_lines: z.array(z.object({}).passthrough()).optional().describe('Line items for the invoice.')
});

const MetadataSchema = z.object({
    account_id: z.string().describe('FreshBooks account ID. Example: "ZyQ04o"')
});

const ProviderInvoiceSchema = z
    .object({
        id: z.union([z.string(), z.number()]),
        customerid: z.union([z.string(), z.number()]).nullable().optional(),
        create_date: z.string().nullable().optional(),
        due_date: z.string().nullable().optional(),
        description: z.string().nullable().optional(),
        terms: z.string().nullable().optional(),
        notes: z.string().nullable().optional(),
        po_number: z.string().nullable().optional(),
        discount_value: z.union([z.string(), z.number()]).nullable().optional(),
        discount_description: z.string().nullable().optional(),
        deposit_amount: z.union([z.string(), z.number()]).nullable().optional(),
        deposit_percent: z.union([z.string(), z.number()]).nullable().optional(),
        deposit_type: z.string().nullable().optional(),
        vis_state: z.number().nullable().optional(),
        status: z.number().nullable().optional(),
        invoice_lines: z.array(z.object({}).passthrough()).nullable().optional(),
        current_organization: z.string().nullable().optional()
    })
    .passthrough();

const OutputSchema = ProviderInvoiceSchema;

const action = createAction({
    description: 'Update an invoice.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,
    scopes: ['user:invoices:write'],

    exec: async (nango, input) => {
        const rawMetadata = await nango.getMetadata();
        const parsedMetadata = MetadataSchema.safeParse(rawMetadata);
        if (!parsedMetadata.success) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'account_id is required in connection metadata.'
            });
        }
        const accountId = parsedMetadata.data.account_id;

        const invoiceUpdate: Record<string, unknown> = {};
        if (input.customerid !== undefined) {
            invoiceUpdate['customerid'] = input.customerid;
        }
        if (input.create_date !== undefined) {
            invoiceUpdate['create_date'] = input.create_date;
        }
        if (input.due_date !== undefined) {
            invoiceUpdate['due_date'] = input.due_date;
        }
        if (input.description !== undefined) {
            invoiceUpdate['description'] = input.description;
        }
        if (input.terms !== undefined) {
            invoiceUpdate['terms'] = input.terms;
        }
        if (input.notes !== undefined) {
            invoiceUpdate['notes'] = input.notes;
        }
        if (input.po_number !== undefined) {
            invoiceUpdate['po_number'] = input.po_number;
        }
        if (input.discount_value !== undefined) {
            invoiceUpdate['discount_value'] = input.discount_value;
        }
        if (input.discount_description !== undefined) {
            invoiceUpdate['discount_description'] = input.discount_description;
        }
        if (input.deposit_amount !== undefined) {
            invoiceUpdate['deposit_amount'] = input.deposit_amount;
        }
        if (input.deposit_percent !== undefined) {
            invoiceUpdate['deposit_percent'] = input.deposit_percent;
        }
        if (input.deposit_type !== undefined) {
            invoiceUpdate['deposit_type'] = input.deposit_type;
        }
        if (input.invoice_lines !== undefined) {
            invoiceUpdate['invoice_lines'] = input.invoice_lines;
        }

        const response = await nango.put({
            // https://www.freshbooks.com/api/invoices
            endpoint: `/accounting/account/${encodeURIComponent(accountId)}/invoices/invoices/${encodeURIComponent(input.invoiceId)}`,
            data: {
                invoice: invoiceUpdate
            },
            retries: 3
        });

        const parsedResponse = z
            .object({
                response: z.object({
                    result: z.object({
                        invoice: z.unknown()
                    })
                })
            })
            .safeParse(response.data);

        if (!parsedResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from FreshBooks API.'
            });
        }

        const invoice = ProviderInvoiceSchema.parse(parsedResponse.data.response.result.invoice);
        return invoice;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
