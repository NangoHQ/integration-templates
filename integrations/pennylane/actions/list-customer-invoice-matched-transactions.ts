import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    customer_invoice_id: z.number().describe('Customer invoice ID. Example: 12345'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().min(1).max(100).optional().describe('Number of items to return per request. Defaults to 20. Must be between 1 and 100.'),
    sort: z.string().optional().describe('Sort field prefixed with - for descending order. Available fields: id. Defaults to -id.')
});

const MatchedTransactionSchema = z.object({
    label: z.string().nullable(),
    amount: z.string().nullable(),
    group_uuid: z.string().nullable(),
    date: z.string().nullable(),
    fee: z.string().nullable(),
    currency: z.string()
});

const ProviderResponseSchema = z.object({
    items: z.array(MatchedTransactionSchema),
    has_more: z.boolean(),
    next_cursor: z.string().nullable().optional()
});

const OutputSchema = z.object({
    items: z.array(MatchedTransactionSchema),
    has_more: z.boolean(),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List transactions matched to a customer invoice.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['customer_invoices:readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://pennylane.readme.io/reference/getcustomerinvoicematchedtransactions
            endpoint: `/api/external/v2/customer_invoices/${encodeURIComponent(String(input.customer_invoice_id))}/matched_transactions`,
            params: {
                ...(input.cursor !== undefined && input.cursor !== '' && { cursor: input.cursor }),
                ...(input.limit !== undefined && { limit: String(input.limit) }),
                ...(input.sort !== undefined && input.sort !== '' && { sort: input.sort })
            },
            retries: 3
        });

        const providerData = ProviderResponseSchema.parse(response.data);

        return {
            items: providerData.items,
            has_more: providerData.has_more,
            ...(providerData.next_cursor != null && providerData.next_cursor !== '' && { next_cursor: providerData.next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
