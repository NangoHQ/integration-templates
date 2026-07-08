import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    customer_invoice_id: z.number().describe('Customer invoice ID. Example: 25461646082048'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().min(1).max(100).optional().describe('Number of items to return per request. Defaults to 20. Must be between 1 and 100.')
});

const ProviderAppendixSchema = z.object({
    id: z.number(),
    url: z.string(),
    filename: z.string(),
    created_at: z.string(),
    updated_at: z.string()
});

const OutputSchema = z.object({
    items: z.array(ProviderAppendixSchema),
    has_more: z.boolean(),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List appendices for a customer invoice',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['customer_invoices:readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://pennylane.readme.io/reference/getcustomerinvoiceappendices
            endpoint: `/api/external/v2/customer_invoices/${encodeURIComponent(String(input.customer_invoice_id))}/appendices`,
            params: {
                ...(input.cursor !== undefined && { cursor: input.cursor }),
                ...(input.limit !== undefined && { limit: input.limit })
            },
            retries: 3
        });

        const providerResponse = z
            .object({
                items: z.array(ProviderAppendixSchema),
                has_more: z.boolean(),
                next_cursor: z.string().nullable()
            })
            .parse(response.data);

        return {
            items: providerResponse.items,
            has_more: providerResponse.has_more,
            ...(providerResponse.next_cursor != null && { next_cursor: providerResponse.next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
