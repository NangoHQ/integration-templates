import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    types: z.array(z.string()).optional(),
    from_date: z.string().optional().describe('Start date filter. Example: "2026-07-01"'),
    to_date: z.string().optional().describe('End date filter. Example: "2026-07-31"'),
    employee_ids: z.array(z.string()).optional(),
    duration: z.number().optional(),
    duration_operator: z.enum(['equal', 'greater_than', 'greater_than_or_equal', 'less_than', 'less_than_or_equal']).optional(),
    limit: z
        .union([z.literal(10), z.literal(20), z.literal(50), z.literal(100)])
        .optional()
        .describe('Page size. Must be exactly 10, 20, 50, or 100.'),
    cursor: z.string().optional().describe('Pagination cursor (offset) from the previous response. Omit for the first page.')
});

const TimeEntrySchema = z
    .object({
        uuid: z.string(),
        employee_id: z.string().optional(),
        type: z.string().optional(),
        clock_in_time: z.string().nullable().optional(),
        clock_out_time: z.string().nullable().optional(),
        worked_minutes: z.number().nullable().optional(),
        is_active: z.boolean().optional(),
        note: z.string().nullable().optional(),
        timezone: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    time_entries: z.array(TimeEntrySchema),
    next_offset: z.string().optional(),
    total_count: z.number()
});

const action = createAction({
    description: 'List time-tracking entries with employee/date/duration filters.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['r_time_tracking'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const offset = input.cursor ? parseInt(input.cursor, 10) : 0;
        if (input.cursor !== undefined && isNaN(offset)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a numeric offset string'
            });
        }

        const params: Record<string, string | string[]> = {
            offset: String(offset),
            ...(input.types !== undefined && input.types.length > 0 ? { 'types[]': input.types } : {}),
            ...(input.from_date !== undefined ? { from_date: input.from_date } : {}),
            ...(input.to_date !== undefined ? { to_date: input.to_date } : {}),
            ...(input.employee_ids !== undefined && input.employee_ids.length > 0 ? { 'employee_ids[]': input.employee_ids } : {}),
            ...(input.duration !== undefined ? { duration: String(input.duration) } : {}),
            ...(input.duration_operator !== undefined ? { duration_operator: input.duration_operator } : {}),
            ...(input.limit !== undefined ? { limit: String(input.limit) } : {})
        };

        // https://workable.readme.io/reference/listtimeentries
        const response = await nango.get({
            endpoint: '/spi/v3/time-tracking/time-entries',
            params,
            retries: 3
        });

        const providerResponse = z
            .object({
                time_entries: z.array(z.unknown()).default([]),
                total_count: z.number().default(0)
            })
            .parse(response.data);

        const timeEntries = providerResponse.time_entries.map((entry) => {
            const parsed = TimeEntrySchema.safeParse(entry);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'invalid_provider_response',
                    message: 'Provider returned an unexpected time entry shape',
                    details: parsed.error.issues
                });
            }
            return parsed.data;
        });

        const hasMore = timeEntries.length > 0 && offset + timeEntries.length < providerResponse.total_count;
        const nextOffset = hasMore ? String(offset + timeEntries.length) : undefined;

        return {
            time_entries: timeEntries,
            total_count: providerResponse.total_count,
            ...(nextOffset !== undefined && { next_offset: nextOffset })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
