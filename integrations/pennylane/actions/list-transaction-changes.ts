import { z } from 'zod';
import type { ProxyConfiguration } from 'nango';
import { createAction } from 'nango';

const InputSchema = z.object({
    start_date: z
        .string()
        .optional()
        .describe('Filter changes from this RFC3339 datetime onward. Example: "2026-01-01T00:00:00Z". If omitted, returns the oldest recorded changes.'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const ProviderChangeSchema = z.object({
    id: z.number().describe('Unique identifier of the transaction record'),
    operation: z.enum(['insert', 'update', 'delete']),
    processed_at: z.string().describe('Timestamp when the event arrived in the change log pipeline'),
    updated_at: z.string().describe('Timestamp when the record was updated in the database'),
    created_at: z.string().describe('Timestamp when the record was initially created')
});

const OutputSchema = z.object({
    items: z.array(ProviderChangeSchema),
    has_more: z.boolean().describe('Indicates whether additional results are available'),
    next_cursor: z.string().optional().describe('Cursor to retrieve the next set of results')
});

const action = createAction({
    description: 'List transaction change events from the changelog API.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['transactions:readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://pennylane.readme.io/reference/gettransactionchanges
            endpoint: '/api/external/v2/changelogs/transactions',
            params: {
                ...(input.start_date !== undefined && { start_date: input.start_date }),
                ...(input.cursor !== undefined && { cursor: input.cursor })
            },
            retries: 3
        };

        const response = await nango.get(config);

        const providerResponse = z
            .object({
                items: z.array(ProviderChangeSchema),
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
