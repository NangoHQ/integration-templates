import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    query: z.string().optional().describe('Close search query syntax. Example: "name:Acme"'),
    cursor: z.string().optional().describe('Pagination cursor (offset) from the previous response. Omit for the first page.'),
    limit: z.number().min(1).max(200).optional().describe('Number of results per page. Max 200.'),
    date_updated__gt: z.string().optional().describe('Filter by update time. Example: "2024-01-01T00:00:00.000000+00:00"')
});

const LeadSchema = z
    .object({
        id: z.string(),
        name: z.string().optional(),
        status_id: z.string().optional(),
        status_label: z.string().optional(),
        date_created: z.string().optional(),
        date_updated: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    data: z.array(LeadSchema),
    has_more: z.boolean(),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List Close leads with optional search query and pagination',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const skip = input.cursor ? parseInt(input.cursor, 10) : 0;
        const limit = input.limit ?? 50;

        const response = await nango.get({
            // https://developer.close.com/
            endpoint: '/v1/lead/',
            params: {
                ...(input.query !== undefined && { query: input.query }),
                ...(input.date_updated__gt !== undefined && { date_updated__gt: input.date_updated__gt }),
                _skip: String(skip),
                _limit: String(limit)
            },
            retries: 3
        });

        const providerResponse = z
            .object({
                data: z.array(z.unknown()),
                has_more: z.boolean()
            })
            .parse(response.data);

        const leads = providerResponse.data.map((item) => {
            const parsed = LeadSchema.safeParse(item);
            if (parsed.success) {
                return parsed.data;
            }
            return {
                id: typeof item === 'object' && item !== null && 'id' in item ? String(item.id) : 'unknown'
            };
        });

        const nextCursor = providerResponse.has_more ? String(skip + limit) : undefined;

        return {
            data: leads,
            has_more: providerResponse.has_more,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
