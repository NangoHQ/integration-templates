import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    first: z.number().int().min(1).max(250).optional().describe('Number of returns to fetch per page. Max 250.'),
    after: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    query: z.string().optional().describe('Filter query string using Shopify search syntax. Example: "status:OPEN".'),
    sortKey: z.string().optional().describe('Sort key for ordering results. Examples: "CREATED_AT", "ID".')
});

const ReturnOutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    status: z.string(),
    createdAt: z.string().optional(),
    orderId: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(ReturnOutputSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List Shopify returns with cursor pagination.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-returns'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_returns'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        throw new nango.ActionError({
            type: 'not_supported',
            message: "Listing returns requires traversing orders. Use the returns sync or query a specific order's returns instead."
        });
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
