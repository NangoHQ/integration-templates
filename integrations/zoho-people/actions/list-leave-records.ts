import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    from: z.string().describe('Start date in dd-MMM-yyyy format. Example: 01-Jun-2026'),
    to: z.string().describe('End date in dd-MMM-yyyy format. Example: 30-Jun-2026'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().optional().describe('Number of records per page. Default: 100')
});

const ProviderResponseSchema = z.object({
    records: z.record(z.string(), z.object({}).passthrough()).optional()
});

const OutputItemSchema = z
    .object({
        id: z.string()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(OutputItemSchema),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List leave records within a date window.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-leave-records',
        group: 'Leave'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const startIndex = input.cursor ? parseInt(input.cursor, 10) : 1;
        const limit = input.limit ?? 100;

        // https://www.zoho.com/people/api/overview.html
        const response = await nango.get({
            endpoint: '/api/v2/leavetracker/leaves/records',
            params: {
                from: input.from,
                to: input.to,
                startIndex: String(startIndex),
                limit: String(limit)
            },
            retries: 3
        });

        const responseData = ProviderResponseSchema.parse(response.data);
        const records = responseData.records || {};
        const recordEntries = Object.entries(records);

        const items = recordEntries.map(([id, fields]) => ({
            id,
            ...fields
        }));

        const nextCursor = recordEntries.length === limit ? String(startIndex + limit) : undefined;

        return {
            items,
            ...(nextCursor !== undefined && { nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
