import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    from: z.number().optional().describe('Minimal creation date for Calls (Unix timestamp).'),
    to: z.number().optional().describe('Maximal creation date for Calls (Unix timestamp).'),
    direction: z.enum(['inbound', 'outbound']).optional().describe('Direction of the Call.'),
    qualified: z.boolean().optional().describe('Whether to return only qualified calls.'),
    per_page: z.number().int().min(1).max(50).optional().describe('Number of results per page. Max 50.'),
    cursor: z.string().optional().describe('Pagination cursor (page number). Omit for the first page.')
});

const MetaSchema = z.object({
    count: z.number(),
    total: z.number(),
    current_page: z.number(),
    per_page: z.number(),
    next_page_link: z.string().nullable(),
    previous_page_link: z.string().nullable()
});

const CallSchema = z
    .object({
        id: z.number(),
        sid: z.string().optional(),
        direct_link: z.string().optional(),
        direction: z.string(),
        status: z.string(),
        missed_call_reason: z.string().nullable().optional(),
        started_at: z.number().optional(),
        answered_at: z.number().optional(),
        ended_at: z.number().optional(),
        duration: z.number().optional(),
        voicemail: z.string().nullable().optional(),
        recording: z.string().nullable().optional(),
        asset: z.string().nullable().optional(),
        raw_digits: z.string().optional(),
        user: z.record(z.string(), z.unknown()).nullable().optional(),
        contact: z.record(z.string(), z.unknown()).nullable().optional(),
        archived: z.boolean().optional(),
        assigned_to: z.record(z.string(), z.unknown()).nullable().optional(),
        transferred_by: z.record(z.string(), z.unknown()).nullable().optional(),
        transferred_to: z.record(z.string(), z.unknown()).nullable().optional(),
        cost: z.string().optional(),
        number: z.record(z.string(), z.unknown()).optional(),
        comments: z.array(z.record(z.string(), z.unknown())).optional(),
        tags: z.array(z.record(z.string(), z.unknown())).optional(),
        teams: z.array(z.record(z.string(), z.unknown())).optional(),
        participants: z.array(z.record(z.string(), z.unknown())).optional(),
        ivr_options_selected: z.array(z.record(z.string(), z.unknown())).optional()
    })
    .passthrough();

const ListOutputSchema = z.object({
    items: z.array(CallSchema),
    next_page: z.number().optional(),
    meta: MetaSchema
});

const action = createAction({
    description: 'List calls from Aircall with optional filters.',
    version: '1.0.0',
    input: InputSchema,
    output: ListOutputSchema,
    scopes: ['public_api'],
    endpoint: {
        path: '/actions/list-calls',
        method: 'GET'
    },

    exec: async (nango, input): Promise<z.infer<typeof ListOutputSchema>> => {
        const params: Record<string, string | number> = {
            ...(input.from !== undefined && { from: input.from }),
            ...(input.to !== undefined && { to: input.to }),
            ...(input.direction !== undefined && { direction: input.direction }),
            ...(input.qualified !== undefined && { qualified: String(input.qualified) }),
            ...(input.per_page !== undefined && { per_page: input.per_page }),
            ...(input.cursor !== undefined && { page: parseInt(input.cursor, 10) })
        };

        // https://developer.aircall.io/api-references/#list-all-calls
        const response = await nango.get({
            endpoint: '/v1/calls',
            params,
            retries: 3
        });

        const rawCalls = z.array(z.unknown()).parse(response.data.calls);
        const meta = MetaSchema.parse(response.data.meta);

        let nextPage: number | undefined;
        if (meta.next_page_link) {
            const url = new URL(meta.next_page_link);
            const pageParam = url.searchParams.get('page');
            if (pageParam) {
                nextPage = parseInt(pageParam, 10);
            }
        }

        return {
            items: rawCalls.map((call) => CallSchema.parse(call)),
            ...(nextPage !== undefined && { next_page: nextPage }),
            meta
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
