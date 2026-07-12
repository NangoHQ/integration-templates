import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    start_date: z.string().optional().describe('RFC3339 datetime filter. Example: "2026-01-01T00:00:00Z". Changes retained for the last 4 weeks.'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().int().min(1).max(1000).optional().describe('Number of items per page. Defaults to 20. Maximum 1000.')
});

const ProviderChangeItemSchema = z.object({
    id: z.number().int(),
    operation: z.enum(['insert', 'update', 'delete']),
    processed_at: z.string(),
    updated_at: z.string(),
    created_at: z.string()
});

const ProviderResponseSchema = z.object({
    items: z.array(ProviderChangeItemSchema),
    has_more: z.boolean(),
    next_cursor: z.string().nullable()
});

const OutputItemSchema = z.object({
    id: z.number().int(),
    operation: z.enum(['insert', 'update', 'delete']),
    processed_at: z.string(),
    updated_at: z.string(),
    created_at: z.string()
});

const OutputSchema = z.object({
    items: z.array(OutputItemSchema),
    has_more: z.boolean(),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List supplier invoice change events from the changelog API.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['supplier_invoices:readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://pennylane.readme.io/reference/getsupplierinvoiceschanges
        const response = await nango.get({
            endpoint: '/api/external/v2/changelogs/supplier_invoices',
            params: {
                ...(input.start_date !== undefined && { start_date: input.start_date }),
                ...(input.cursor !== undefined && { cursor: input.cursor }),
                ...(input.limit !== undefined && { limit: String(input.limit) })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            items: providerResponse.items.map((item) => ({
                id: item.id,
                operation: item.operation,
                processed_at: item.processed_at,
                updated_at: item.updated_at,
                created_at: item.created_at
            })),
            has_more: providerResponse.has_more,
            ...(providerResponse.next_cursor != null && { next_cursor: providerResponse.next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
