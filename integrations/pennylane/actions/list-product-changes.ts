import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    start_date: z.string().optional().describe('RFC3339 datetime filter. Example: "2026-01-01T00:00:00Z"'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().int().min(1).max(1000).optional().describe('Number of items per page. Defaults to 20, max 1000.')
});

const ProviderChangeEventSchema = z.object({
    id: z.number(),
    operation: z.enum(['insert', 'update', 'delete']),
    processed_at: z.string(),
    updated_at: z.string(),
    created_at: z.string()
});

const ProviderResponseSchema = z.object({
    items: z.array(ProviderChangeEventSchema),
    has_more: z.boolean(),
    next_cursor: z.string().nullable()
});

const ChangeEventSchema = z.object({
    id: z.number(),
    operation: z.enum(['insert', 'update', 'delete']),
    processed_at: z.string(),
    updated_at: z.string(),
    created_at: z.string()
});

const OutputSchema = z.object({
    items: z.array(ChangeEventSchema),
    has_more: z.boolean(),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List product change events from the changelog API.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['products:readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {};
        if (input.start_date !== undefined) {
            params['start_date'] = input.start_date;
        }
        if (input.cursor !== undefined) {
            params['cursor'] = input.cursor;
        }
        if (input.limit !== undefined) {
            params['limit'] = input.limit;
        }

        const response = await nango.get({
            // https://pennylane.readme.io/reference/getproductchanges
            endpoint: '/api/external/v2/changelogs/products',
            params,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            items: providerResponse.items,
            has_more: providerResponse.has_more,
            ...(providerResponse.next_cursor != null && { next_cursor: providerResponse.next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
