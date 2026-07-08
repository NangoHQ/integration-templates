import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    transaction_id: z.number().describe('Transaction ID. Example: 25465370439680'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().min(1).max(100).optional().describe('Number of items to return per page. Defaults to 20.')
});

const MatchedInvoiceSchema = z.object({
    id: z.number(),
    type: z.string(),
    url: z.string()
});

const OutputSchema = z.object({
    items: z.array(MatchedInvoiceSchema),
    has_more: z.boolean().optional(),
    next_cursor: z.string().optional()
});

const ProviderResponseSchema = z.object({
    items: z.array(MatchedInvoiceSchema),
    has_more: z.boolean().optional(),
    next_cursor: z.string().nullable().optional()
});

const action = createAction({
    description: 'List invoices matched to a bank transaction',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['transactions:readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://pennylane.readme.io/reference/gettransactionmatchedinvoices
            endpoint: `/api/external/v2/transactions/${encodeURIComponent(String(input.transaction_id))}/matched_invoices`,
            params: {
                ...(input.cursor !== undefined && { cursor: input.cursor }),
                ...(input.limit !== undefined && { limit: String(input.limit) })
            },
            retries: 3
        });

        const providerData = ProviderResponseSchema.parse(response.data);

        return {
            items: providerData.items,
            ...(providerData.has_more !== undefined && { has_more: providerData.has_more }),
            ...(providerData.next_cursor != null && { next_cursor: providerData.next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
