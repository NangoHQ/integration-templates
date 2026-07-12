import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    start_date: z
        .string()
        .optional()
        .describe('Filter the changes based on the event date. The date should follow RFC3339 format. Example: "2025-06-25T11:54:18.589480Z"'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z
        .number()
        .min(1)
        .max(1000)
        .optional()
        .describe('Number of items to return per request. Defaults to 20 if not specified. Must be between 1 and 1000.')
});

const ProviderChangeSchema = z.object({
    id: z.number(),
    operation: z.enum(['insert', 'update', 'delete']),
    processed_at: z.string(),
    updated_at: z.string(),
    created_at: z.string()
});

const ProviderResponseSchema = z.object({
    items: z.array(ProviderChangeSchema),
    has_more: z.boolean(),
    next_cursor: z.string().nullable()
});

const OutputSchema = z.object({
    items: z.array(
        z.object({
            id: z.number(),
            operation: z.string(),
            processed_at: z.string(),
            updated_at: z.string(),
            created_at: z.string()
        })
    ),
    has_more: z.boolean(),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List supplier change events from the changelog API.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['suppliers:readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://pennylane.readme.io/reference/getsupplierchanges.md
            endpoint: '/api/external/v2/changelogs/suppliers',
            params: {
                ...(input.start_date !== undefined && { start_date: input.start_date }),
                ...(input.cursor !== undefined && { cursor: input.cursor }),
                ...(input.limit !== undefined && { limit: input.limit })
            },
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
