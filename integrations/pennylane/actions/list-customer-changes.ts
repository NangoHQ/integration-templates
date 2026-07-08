import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    start_date: z.string().optional().describe('RFC3339 datetime filter for change events. Changes are retained for 4 weeks. Example: "2026-01-01T00:00:00Z"'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().int().min(1).max(1000).optional().describe('Number of items to return per request. Defaults to 20 if not specified.')
});

const CustomerChangeSchema = z.object({
    id: z.number().describe('Unique identifier of the customer record'),
    operation: z.enum(['insert', 'update', 'delete']).describe('Type of change event'),
    processed_at: z.string().describe('Timestamp when the event arrived in the change log pipeline'),
    updated_at: z.string().describe('Timestamp when the record was updated in the database'),
    created_at: z.string().describe('Timestamp when the record was initially created')
});

const OutputSchema = z.object({
    items: z.array(CustomerChangeSchema),
    has_more: z.boolean().describe('Indicates whether additional results are available'),
    next_cursor: z.string().optional().describe('Cursor to retrieve the next set of results. Omit when null.')
});

const action = createAction({
    description: 'List customer change events from the changelog API.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['customers:readonly'],

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

        // https://pennylane.readme.io/reference/getcustomerchanges
        const response = await nango.get({
            endpoint: '/api/external/v2/changelogs/customers',
            params,
            retries: 3
        });

        const raw = response.data;

        if (typeof raw !== 'object' || raw === null || !Array.isArray(raw.items)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response shape from changelog customers endpoint'
            });
        }

        const parsedItems: z.infer<typeof CustomerChangeSchema>[] = [];
        for (const item of raw.items) {
            const parsed = CustomerChangeSchema.safeParse(item);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Failed to parse a customer change event',
                    detail: parsed.error.message
                });
            }
            parsedItems.push(parsed.data);
        }

        const hasMore = typeof raw.has_more === 'boolean' ? raw.has_more : false;
        const nextCursor = raw.next_cursor != null && typeof raw.next_cursor === 'string' ? raw.next_cursor : undefined;

        return {
            items: parsedItems,
            has_more: hasMore,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
