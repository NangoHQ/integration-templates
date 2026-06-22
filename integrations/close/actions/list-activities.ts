import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    lead_id: z.string().optional().describe('Lead ID to filter activities by. Example: "lead_xxx"'),
    user_id: z.string().optional().describe('User ID to filter activities by. Example: "user_xxx"'),
    date_updated__gt: z.string().optional().describe('Filter activities updated after this ISO8601 timestamp. Example: "2024-01-01T00:00:00.000000+00:00"'),
    cursor: z.string().optional().describe('Pagination offset from the previous response (maps to _skip). Omit for the first page.'),
    _limit: z.string().optional().describe('Max number of results per page. Default 100, max 100 for activity endpoint. Example: "100"')
});

const ActivitySchema = z
    .object({
        id: z.string(),
        _type: z.string()
    })
    .passthrough();

const OutputSchema = z.object({
    data: z.array(ActivitySchema),
    has_more: z.boolean().optional(),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List all activity types across leads (notes, calls, emails, SMS, created events).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const skip = input.cursor ?? '0';
        const limit = input._limit ?? '100';

        const response = await nango.get({
            // https://developer.close.com/api/resources/activities/list
            endpoint: '/v1/activity/',
            params: {
                ...(input.lead_id !== undefined && { lead_id: input.lead_id }),
                ...(input.user_id !== undefined && { user_id: input.user_id }),
                ...(input.date_updated__gt !== undefined && { date_updated__gt: input.date_updated__gt }),
                _skip: skip,
                _limit: limit
            },
            retries: 3
        });

        const providerResponse = z
            .object({
                data: z.array(z.unknown()),
                has_more: z.boolean().optional()
            })
            .parse(response.data);

        const nextSkip = parseInt(skip, 10) + providerResponse.data.length;
        const nextCursor = providerResponse.has_more ? String(nextSkip) : undefined;

        return {
            data: providerResponse.data.map((item) => {
                const activity = ActivitySchema.parse(item);
                return activity;
            }),
            ...(providerResponse.has_more !== undefined && { has_more: providerResponse.has_more }),
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
