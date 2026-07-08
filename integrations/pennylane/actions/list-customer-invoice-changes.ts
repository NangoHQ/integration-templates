import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        start_date: z.string().optional().describe('RFC3339 datetime filter. Example: "2026-01-01T00:00:00Z". Changes for the last 4 weeks are retained.'),
        cursor: z
            .string()
            .optional()
            .describe('Pagination cursor from the previous response. Omit for the first page. Must not be used together with start_date.'),
        limit: z.number().int().min(1).max(1000).optional().describe('Number of items to return per request. Defaults to 20. Must be between 1 and 1000.')
    })
    .refine((data) => !(data.start_date !== undefined && data.cursor !== undefined), {
        message: 'start_date and cursor must not be used together',
        path: ['cursor']
    });

const ChangeEventSchema = z.object({
    id: z.number().describe('Unique identifier of the customer invoice record. Example: 25461646082048'),
    operation: z.enum(['insert', 'update', 'delete']),
    processed_at: z.string().describe('Timestamp when the event arrived in the change log pipeline. Example: "2026-01-01T00:00:00Z"'),
    updated_at: z.string().describe('Timestamp when the record was updated in the database. Example: "2026-01-01T00:00:00Z"'),
    created_at: z.string().describe('Timestamp when the record was initially created. Example: "2026-01-01T00:00:00Z"')
});

const OutputSchema = z.object({
    items: z.array(ChangeEventSchema),
    has_more: z.boolean().describe('Indicates whether additional results are available beyond this set.'),
    next_cursor: z.string().optional().describe('Cursor to retrieve the next set of results. Omitted when there are no further results.')
});

const action = createAction({
    description: 'List customer invoice change events from the changelog API.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['customer_invoices:readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://pennylane.readme.io/reference/getcustomerinvoiceschanges
            endpoint: '/api/external/v2/changelogs/customer_invoices',
            params: {
                ...(input.start_date !== undefined && { start_date: input.start_date }),
                ...(input.cursor !== undefined && { cursor: input.cursor }),
                ...(input.limit !== undefined && { limit: String(input.limit) })
            },
            retries: 3
        });

        const providerResponse = z
            .object({
                items: z.array(ChangeEventSchema),
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
