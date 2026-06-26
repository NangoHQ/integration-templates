import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().optional().describe('Number of items to return per page. Default: 100.')
});

const TransactionSchema = z.object({
    EntryID: z.string().describe('Unique entry ID. Example: "2ab359f3-0042-4e57-b829-d7d7cc84d1ea"'),
    EntryNumber: z.number().optional(),
    Date: z.string().optional(),
    Modified: z.string().optional(),
    JournalCode: z.string().optional(),
    JournalDescription: z.string().optional(),
    Status: z.number().optional(),
    Type: z.number().optional(),
    TypeDescription: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(TransactionSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List financial transaction headers.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    endpoint: {
        path: '/actions/list-financial-transactions',
        method: 'GET'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const limit = input.limit || 100;

        // https://support.exactonline.com/doc/EN/RestAPI/Documentation/CurrentMe
        const meResponse = await nango.get({
            endpoint: '/api/v1/current/Me',
            retries: 3
        });

        const meData = z
            .object({
                d: z.union([z.object({ CurrentDivision: z.number() }), z.object({ results: z.array(z.object({ CurrentDivision: z.number() })) })])
            })
            .parse(meResponse.data);

        const division = 'CurrentDivision' in meData.d ? meData.d.CurrentDivision : meData.d.results[0]?.CurrentDivision;
        if (!division) {
            throw new nango.ActionError({
                type: 'missing_division',
                message: 'Could not determine CurrentDivision from Me endpoint.'
            });
        }

        const params: Record<string, string> = {
            $select: 'EntryID,EntryNumber,Date,Modified,JournalCode,JournalDescription,Status,Type,TypeDescription',
            $top: String(limit)
        };

        if (input.cursor) {
            params['$skiptoken'] = input.cursor;
        }

        // https://support.exactonline.com/doc/EN/RestAPI/Documentation/FinancialTransaction
        const response = await nango.get({
            endpoint: `/api/v1/${encodeURIComponent(division)}/financialtransaction/Transactions`,
            params,
            retries: 3
        });

        const data = z
            .object({
                d: z.union([
                    z.array(z.unknown()),
                    z.object({
                        results: z.array(z.unknown()),
                        __next: z.string().optional()
                    })
                ])
            })
            .parse(response.data);

        const rawItems = Array.isArray(data.d) ? data.d : data.d.results;
        const nextLink = Array.isArray(data.d) ? undefined : data.d.__next;

        const items = rawItems.map((item) => {
            return TransactionSchema.parse(item);
        });

        let nextCursor: string | undefined;
        if (nextLink) {
            const url = new URL(nextLink);
            nextCursor = url.searchParams.get('$skiptoken') || undefined;
        }

        return {
            items,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
