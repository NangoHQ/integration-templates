import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    start_date: z.string().optional().describe('RFC3339 datetime filter. Example: "2026-07-01T00:00:00Z"'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().int().min(1).max(1000).optional().describe('Number of items per page. Defaults to 20, max 1000.')
});

const ProviderChangeSchema = z.object({
    id: z.number(),
    operation: z.enum(['insert', 'update', 'delete']),
    processed_at: z.string(),
    updated_at: z.string().optional(),
    created_at: z.string().optional()
});

const ProviderResponseSchema = z.object({
    items: z.array(ProviderChangeSchema),
    has_more: z.boolean().optional(),
    next_cursor: z.string().nullable().optional()
});

const OutputSchema = z.object({
    items: z.array(
        z.object({
            id: z.number(),
            operation: z.enum(['insert', 'update', 'delete']),
            processed_at: z.string(),
            updated_at: z.string().optional(),
            created_at: z.string().optional()
        })
    ),
    has_more: z.boolean().optional(),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List quote change events from the changelog API.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['quotes:readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.start_date !== undefined && input.cursor !== undefined) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'You cannot provide both start_date and cursor in the same request.'
            });
        }

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
            // https://pennylane.readme.io/reference/getquotechanges
            endpoint: '/api/external/v2/changelogs/quotes',
            params,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            items: providerResponse.items.map((item) => ({
                id: item.id,
                operation: item.operation,
                processed_at: item.processed_at,
                ...(item.updated_at !== undefined && { updated_at: item.updated_at }),
                ...(item.created_at !== undefined && { created_at: item.created_at })
            })),
            ...(providerResponse.has_more !== undefined && { has_more: providerResponse.has_more }),
            ...(providerResponse.next_cursor != null && { next_cursor: providerResponse.next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
