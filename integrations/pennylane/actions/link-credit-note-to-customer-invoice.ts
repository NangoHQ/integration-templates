import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    invoice_id: z.number().describe('Customer invoice ID. Example: 25465314803712'),
    credit_note_id: z.number().describe('Credit note ID. Example: 25465319419904')
});

const ProviderInvoiceSchema = z.object({
    id: z.number(),
    label: z.string().nullable(),
    invoice_number: z.string(),
    currency: z.string(),
    amount: z.string(),
    date: z.string().nullable(),
    deadline: z.string().nullable(),
    status: z.string(),
    draft: z.boolean(),
    paid: z.boolean(),
    created_at: z.string(),
    updated_at: z.string()
});

const OutputSchema = z.object({
    id: z.number(),
    label: z.string().optional(),
    invoice_number: z.string(),
    currency: z.string(),
    amount: z.string(),
    date: z.string().optional(),
    deadline: z.string().optional(),
    status: z.string(),
    draft: z.boolean(),
    paid: z.boolean(),
    created_at: z.string(),
    updated_at: z.string()
});

const action = createAction({
    description: 'Link a credit note to a customer invoice',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['customer_invoices:all'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://pennylane.readme.io/reference/linkcreditnote
            endpoint: `/api/external/v2/customer_invoices/${encodeURIComponent(String(input.invoice_id))}/link_credit_note`,
            data: {
                credit_note_id: input.credit_note_id
            },
            retries: 3
        });

        const providerInvoice = ProviderInvoiceSchema.parse(response.data);

        return {
            id: providerInvoice.id,
            ...(providerInvoice.label != null && { label: providerInvoice.label }),
            invoice_number: providerInvoice.invoice_number,
            currency: providerInvoice.currency,
            amount: providerInvoice.amount,
            ...(providerInvoice.date != null && { date: providerInvoice.date }),
            ...(providerInvoice.deadline != null && { deadline: providerInvoice.deadline }),
            status: providerInvoice.status,
            draft: providerInvoice.draft,
            paid: providerInvoice.paid,
            created_at: providerInvoice.created_at,
            updated_at: providerInvoice.updated_at
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
