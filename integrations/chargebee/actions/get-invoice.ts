import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Invoice ID. Example: "1"')
});

const ProviderInvoiceSchema = z
    .object({
        id: z.string(),
        customer_id: z.string(),
        subscription_id: z.string().nullable().optional(),
        status: z.string(),
        recurring: z.boolean(),
        date: z.number().optional(),
        due_date: z.number().optional(),
        total: z.number().optional(),
        amount_due: z.number().optional(),
        amount_paid: z.number().optional(),
        currency_code: z.string(),
        deleted: z.boolean(),
        updated_at: z.number().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string(),
    customer_id: z.string(),
    subscription_id: z.string().optional(),
    status: z.string(),
    recurring: z.boolean(),
    date: z.number().optional(),
    due_date: z.number().optional(),
    total: z.number().optional(),
    amount_due: z.number().optional(),
    amount_paid: z.number().optional(),
    currency_code: z.string(),
    deleted: z.boolean(),
    updated_at: z.number().optional()
});

const action = createAction({
    description: 'Retrieve a single invoice by ID',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://apidocs.chargebee.com/docs/api/invoices
            endpoint: `/api/v2/invoices/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object' || !('invoice' in response.data)) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Invoice not found or unexpected response format',
                invoice_id: input.id
            });
        }

        const providerInvoice = ProviderInvoiceSchema.parse(response.data.invoice);

        return {
            id: providerInvoice.id,
            customer_id: providerInvoice.customer_id,
            ...(providerInvoice.subscription_id != null && { subscription_id: providerInvoice.subscription_id }),
            status: providerInvoice.status,
            recurring: providerInvoice.recurring,
            ...(providerInvoice.date != null && { date: providerInvoice.date }),
            ...(providerInvoice.due_date != null && { due_date: providerInvoice.due_date }),
            ...(providerInvoice.total != null && { total: providerInvoice.total }),
            ...(providerInvoice.amount_due != null && { amount_due: providerInvoice.amount_due }),
            ...(providerInvoice.amount_paid != null && { amount_paid: providerInvoice.amount_paid }),
            currency_code: providerInvoice.currency_code,
            deleted: providerInvoice.deleted,
            ...(providerInvoice.updated_at != null && { updated_at: providerInvoice.updated_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
