import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    customer_invoice_id: z.number().describe('Customer invoice ID. Example: 25461646082048'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().min(1).max(100).optional().describe('Number of items to return per request. Defaults to 20.'),
    sort: z.string().optional().describe("Sort field. Available fields: id. Prefix with - for descending order. Defaults to '-id'.")
});

const ProviderInvoiceLineSectionSchema = z.object({
    id: z.number(),
    title: z.string().nullable(),
    description: z.string().nullable(),
    rank: z.number(),
    created_at: z.string(),
    updated_at: z.string()
});

const ProviderResponseSchema = z.object({
    has_more: z.boolean(),
    next_cursor: z.string().nullable(),
    items: z.array(ProviderInvoiceLineSectionSchema)
});

const InvoiceLineSectionSchema = z.object({
    id: z.number(),
    title: z.string().optional(),
    description: z.string().optional(),
    rank: z.number(),
    created_at: z.string(),
    updated_at: z.string()
});

const OutputSchema = z.object({
    items: z.array(InvoiceLineSectionSchema),
    has_more: z.boolean(),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List invoice line sections for a customer invoice.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['customer_invoices:readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://pennylane.readme.io/reference/getcustomerinvoiceinvoicelinesections
            endpoint: `/api/external/v2/customer_invoices/${encodeURIComponent(String(input.customer_invoice_id))}/invoice_line_sections`,
            params: {
                ...(input.cursor !== undefined && { cursor: input.cursor }),
                ...(input.limit !== undefined && { limit: input.limit }),
                ...(input.sort !== undefined && { sort: input.sort })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            items: providerResponse.items.map((item) => ({
                id: item.id,
                rank: item.rank,
                created_at: item.created_at,
                updated_at: item.updated_at,
                ...(item.title != null && { title: item.title }),
                ...(item.description != null && { description: item.description })
            })),
            has_more: providerResponse.has_more,
            ...(providerResponse.next_cursor != null && { next_cursor: providerResponse.next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
