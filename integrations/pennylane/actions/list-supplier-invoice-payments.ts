import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    supplier_invoice_id: z.number().describe('Supplier invoice ID. Example: 1234'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().min(1).max(100).optional().describe('Number of items to return per request. Defaults to 20. Must be between 1 and 100.'),
    sort: z.string().optional().describe("Sort field. Defaults to '-id'. Available fields: id.")
});

const ProviderPaymentSchema = z.object({
    id: z.number(),
    label: z.string(),
    currency: z.string().nullable().optional(),
    currency_amount: z.string(),
    status: z.string(),
    created_at: z.string(),
    updated_at: z.string()
});

const ProviderListResponseSchema = z.object({
    has_more: z.boolean(),
    next_cursor: z.string().nullable(),
    items: z.array(ProviderPaymentSchema)
});

const OutputPaymentSchema = z.object({
    id: z.number(),
    label: z.string(),
    currency: z.string().optional(),
    currency_amount: z.string(),
    status: z.string(),
    created_at: z.string(),
    updated_at: z.string()
});

const OutputSchema = z.object({
    items: z.array(OutputPaymentSchema),
    next_cursor: z.string().optional(),
    has_more: z.boolean()
});

const action = createAction({
    description: 'List payments for a supplier invoice',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['supplier_invoices:readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://pennylane.readme.io/reference/getsupplierinvoicepayments
            endpoint: `/api/external/v2/supplier_invoices/${encodeURIComponent(String(input.supplier_invoice_id))}/payments`,
            params: {
                ...(input.cursor !== undefined && { cursor: input.cursor }),
                ...(input.limit !== undefined && { limit: input.limit }),
                ...(input.sort !== undefined && { sort: input.sort })
            },
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Provider returned an unexpected response body.'
            });
        }

        const providerData = ProviderListResponseSchema.parse(response.data);

        return {
            items: providerData.items.map((item) => ({
                id: item.id,
                label: item.label,
                currency_amount: item.currency_amount,
                status: item.status,
                created_at: item.created_at,
                updated_at: item.updated_at,
                ...(item.currency != null && { currency: item.currency })
            })),
            has_more: providerData.has_more,
            ...(providerData.next_cursor != null && { next_cursor: providerData.next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
