import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    invoice_id: z.string().describe('Contracted invoice internal identifier. Example: "6a71e07dcb6ddf6b370e0afd"')
});

const InvoiceItemSchema = z.object({
    id: z.string(),
    gross_value: z.string().nullable().optional(),
    unit_value: z.string().nullable().optional(),
    unit_quantity: z.number().nullable().optional(),
    cost_code_id: z.string().nullable().optional(),
    retention_gross_value: z.string().nullable().optional(),
    retention_withheld_this_period_value: z.string().nullable().optional(),
    retention_released_value: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    site_id: z.string().nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    generated_id: z.string().nullable().optional(),
    contract_id: z.string().nullable().optional(),
    client_company_id: z.string().nullable().optional(),
    vendor_company_id: z.string().nullable().optional(),
    custom_id: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    type: z.string().nullable().optional(),
    project_id: z.string().nullable().optional(),
    invoice_date: z.string().nullable().optional(),
    start_date: z.string().nullable().optional(),
    end_date: z.string().nullable().optional(),
    net_value: z.string().nullable().optional(),
    gross_value: z.string().nullable().optional(),
    paid_value: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
    created_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional(),
    items: z.array(InvoiceItemSchema).nullable().optional(),
    document_ids: z.array(z.string()).nullable().optional()
});

const action = createAction({
    description: 'Get a single contracted invoice by id.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://api.ingenious.build/reference/v2-get-contracted-invoicepub.md
        const response = await nango.get({
            endpoint: `/api/v2/pub/contracted-invoices/${encodeURIComponent(input.invoice_id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Contracted invoice not found',
                invoice_id: input.invoice_id
            });
        }

        const providerInvoice = OutputSchema.parse(response.data);
        return providerInvoice;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
