import { z } from 'zod';
import { createAction } from 'nango';

const ListLedgerEntriesInputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().min(1).max(100).optional().describe('Number of items to return per request. Defaults to 20. Must be between 1 and 100.')
});

const ListLedgerEntriesOutputSchema = z.object({
    items: z.array(z.unknown()),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List ledger entries.',
    version: '1.0.0',
    input: ListLedgerEntriesInputSchema,
    output: ListLedgerEntriesOutputSchema,
    scopes: ['ledger_entries:readonly'],

    exec: async (nango, input): Promise<z.infer<typeof ListLedgerEntriesOutputSchema>> => {
        const response = await nango.get({
            // https://pennylane.readme.io/reference/getledgerentries
            endpoint: '/api/external/v2/ledger_entries',
            params: {
                ...(input.cursor !== undefined && { cursor: input.cursor }),
                ...(input.limit !== undefined && { limit: String(input.limit) })
            },
            retries: 3
        });

        const responseData = z
            .object({
                items: z.array(z.unknown()).optional(),
                next_cursor: z.string().nullable().optional()
            })
            .parse(response.data);

        const items = responseData.items || [];
        const nextCursor = responseData.next_cursor;

        return {
            items,
            ...(nextCursor != null && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
