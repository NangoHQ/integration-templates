import { z } from 'zod';
import { createAction } from 'nango';

const DEFAULT_LIMIT = 25;

const InputSchema = z
    .object({
        query: z.string().optional().describe('Search query string to filter schedules by name.'),
        include: z
            .array(z.string())
            .optional()
            .describe('Array of additional details to include in the response, such as schedule_layers, overrides_subschedule, or final_schedule.'),
        time_zone: z.string().optional().describe('Time zone in which dates in the result will be rendered.'),
        include_next_oncall_for_user: z.string().optional().describe('User ID to include next on-call information for in the response.'),
        since: z.string().optional().describe('Start of the date range over which to show schedule entries. ISO 8601 format.'),
        until: z.string().optional().describe('End of the date range over which to show schedule entries. ISO 8601 format.'),
        team_ids: z.array(z.string()).optional().describe('Array of team IDs to filter schedules by team membership.'),
        limit: z.number().int().min(1).max(100).optional().describe('Number of results per page. Defaults to 25. Must be between 1 and 100.'),
        cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
        total: z.boolean().optional().describe('If true, the total count of results will be included in the response.')
    })
    .describe('Input parameters for listing PagerDuty on-call schedules.');

const ScheduleSchema = z
    .object({
        id: z.string().describe('Unique identifier of the schedule.'),
        type: z.string().describe('Type of the resource. Always "schedule" for legacy v2 schedules.'),
        summary: z.string().optional().describe('A short summary of the schedule.'),
        self: z.string().optional().describe('API URL of the schedule resource.'),
        html_url: z.string().optional().describe('URL to the schedule in the PagerDuty web UI.'),
        name: z.string().optional().describe('Name of the schedule.'),
        description: z.string().nullable().optional().describe('Description of the schedule.'),
        time_zone: z.string().optional().describe('Time zone in which the schedule is rendered.'),
        schedule_layers: z.array(z.unknown()).optional().describe('Layers of schedule rotation defining how users rotate through the schedule.')
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    schedules: z.array(ScheduleSchema),
    limit: z.number(),
    offset: z.number(),
    total: z.number().nullable(),
    more: z.boolean()
});

const OutputSchema = z
    .object({
        schedules: z.array(ScheduleSchema).describe('Array of on-call schedules matching the query.'),
        limit: z.number().describe('Number of results returned in this page.'),
        offset: z.number().describe('Offset of the current page.'),
        total: z.number().nullable().describe('Total number of matching results. Null unless total=true was requested.'),
        more: z.boolean().describe('Whether additional pages of results exist.'),
        next_cursor: z.string().optional().describe('Cursor to retrieve the next page of results. Omitted if this is the last page.')
    })
    .describe('Paginated list of PagerDuty on-call schedules with pagination metadata.');

/**
 * @tags: [read]
 * @tagReason: Retrieves a paginated list of on-call schedules from the provider.
 * @pitfalls: total is null unless total=true is passed. Lists legacy v2 schedules only; shift-based v3 schedules are excluded.
 */
const action = createAction({
    description: 'List on-call schedules (legacy/v2 schedule model).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['schedules.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.cursor !== undefined && !/^\d+$/.test(input.cursor)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a non-negative integer offset string.'
            });
        }

        const offset = input.cursor ? parseInt(input.cursor, 10) : 0;
        const limit = input.limit ?? DEFAULT_LIMIT;

        const response = await nango.get({
            // https://developer.pagerduty.com/api-reference/846ecf84402bb-list-schedules
            endpoint: '/schedules',
            params: {
                ...(input.query !== undefined && { query: input.query }),
                ...(input.include !== undefined && input.include.length > 0 && { 'include[]': input.include }),
                ...(input.time_zone !== undefined && { time_zone: input.time_zone }),
                ...(input.include_next_oncall_for_user !== undefined && { include_next_oncall_for_user: input.include_next_oncall_for_user }),
                ...(input.since !== undefined && { since: input.since }),
                ...(input.until !== undefined && { until: input.until }),
                ...(input.team_ids !== undefined && input.team_ids.length > 0 && { 'team_ids[]': input.team_ids }),
                limit: limit,
                offset: offset,
                ...(input.total !== undefined && { total: String(input.total) })
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        const nextOffset = offset + limit;
        const next_cursor = parsed.more ? String(nextOffset) : undefined;

        return {
            schedules: parsed.schedules,
            limit: parsed.limit,
            offset: parsed.offset,
            total: parsed.total,
            more: parsed.more,
            ...(next_cursor !== undefined && { next_cursor: next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
