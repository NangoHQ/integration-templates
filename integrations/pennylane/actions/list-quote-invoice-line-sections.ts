import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    quote_id: z.number().int().describe('Quote ID. Example: 25461979840512'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of items to return per request. Defaults to 20 if not specified. Must be between 1 and 100.')
});

const ProviderInvoiceLineSectionSchema = z.object({
    id: z.number().int(),
    title: z.string().nullable(),
    description: z.string().nullable(),
    rank: z.number().int(),
    created_at: z.string(),
    updated_at: z.string()
});

const ProviderResponseSchema = z.object({
    has_more: z.boolean(),
    next_cursor: z.string().nullable(),
    items: z.array(ProviderInvoiceLineSectionSchema)
});

const OutputItemSchema = z.object({
    id: z.number().int(),
    title: z.string().optional(),
    description: z.string().optional(),
    rank: z.number().int(),
    created_at: z.string(),
    updated_at: z.string()
});

const OutputSchema = z.object({
    items: z.array(OutputItemSchema),
    has_more: z.boolean(),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List invoice line sections for a quote',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['quotes:readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://pennylane.readme.io/reference/getquoteinvoicelinesections
            endpoint: `/api/external/v2/quotes/${encodeURIComponent(input.quote_id)}/invoice_line_sections`,
            params: {
                ...(input.cursor !== undefined && { cursor: input.cursor }),
                ...(input.limit !== undefined && { limit: String(input.limit) })
            },
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Received an invalid or non-JSON response from the Pennylane API.'
            });
        }

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            items: providerResponse.items.map((item) => ({
                id: item.id,
                ...(item.title != null && { title: item.title }),
                ...(item.description != null && { description: item.description }),
                rank: item.rank,
                created_at: item.created_at,
                updated_at: item.updated_at
            })),
            has_more: providerResponse.has_more,
            ...(providerResponse.next_cursor != null && { next_cursor: providerResponse.next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
