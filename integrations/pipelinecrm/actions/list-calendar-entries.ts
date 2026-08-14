import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    kind: z.enum(['task', 'event']).optional().describe('Filter by calendar entry kind. Either task or event.'),
    completed: z.boolean().optional().describe('Filter to completed entries.'),
    incomplete: z.boolean().optional().describe('Filter to incomplete entries.'),
    late: z.boolean().optional().describe('Filter to late entries.'),
    today: z.boolean().optional().describe('Filter to entries scheduled for today.'),
    this_week: z.boolean().optional().describe('Filter to entries scheduled for this week.'),
    next_week: z.boolean().optional().describe('Filter to entries scheduled for next week.'),
    future: z.boolean().optional().describe('Filter to future entries.'),
    someday: z.boolean().optional().describe('Filter to entries with no specific date.')
});

const CalendarEntrySchema = z
    .object({
        id: z.number(),
        type: z.string(),
        name: z.string().optional().nullable(),
        description: z.string().optional().nullable(),
        complete: z.boolean().optional().nullable(),
        completed_at: z.string().optional().nullable(),
        due_date: z.string().optional().nullable(),
        start_time: z.string().optional().nullable(),
        end_time: z.string().optional().nullable(),
        all_day: z.boolean().optional().nullable(),
        created_at: z.string().optional().nullable(),
        updated_at: z.string().optional().nullable(),
        company_id: z.number().optional().nullable(),
        owner_id: z.number().optional().nullable(),
        association_id: z.number().optional().nullable(),
        association_type: z.string().optional().nullable(),
        calendar_entry_priority_id: z.number().optional().nullable(),
        calendar_entry_status_id: z.number().optional().nullable(),
        active: z.boolean().optional().nullable(),
        base_entry_id: z.number().optional().nullable(),
        google_calendar_id: z.string().optional().nullable(),
        rrule: z.string().optional().nullable(),
        rdate: z.string().optional().nullable(),
        exrule: z.string().optional().nullable(),
        exdate: z.string().optional().nullable(),
        created_by_user_id: z.number().optional().nullable(),
        parent_id: z.number().optional().nullable(),
        subentry_status: z.string().optional().nullable(),
        project_milestone_id: z.number().optional().nullable(),
        part_of_recurring_series: z.boolean().optional().nullable(),
        recurrence_end: z.string().optional().nullable()
    })
    .passthrough();

const OutputSchema = z.object({
    entries: z.array(CalendarEntrySchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List calendar entries — a unified model covering both Tasks and Events.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.cursor !== undefined && !/^[1-9]\d*$/.test(input.cursor)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a positive integer page number'
            });
        }

        const page = input.cursor ? parseInt(input.cursor, 10) : 1;

        const params: Record<string, string> = {
            page: String(page),
            ...(input.kind && { 'conditions[kind]': input.kind }),
            ...(input.completed !== undefined && { 'conditions[completed]': String(input.completed) }),
            ...(input.incomplete !== undefined && { 'conditions[incomplete]': String(input.incomplete) }),
            ...(input.late !== undefined && { 'conditions[late]': String(input.late) }),
            ...(input.today !== undefined && { 'conditions[today]': String(input.today) }),
            ...(input.this_week !== undefined && { 'conditions[this_week]': String(input.this_week) }),
            ...(input.next_week !== undefined && { 'conditions[next_week]': String(input.next_week) }),
            ...(input.future !== undefined && { 'conditions[future]': String(input.future) }),
            ...(input.someday !== undefined && { 'conditions[someday]': String(input.someday) })
        };

        const response = await nango.get({
            // https://app.pipelinecrm.com/api/docs/introduction
            endpoint: 'api/v3/calendar_entries',
            params,
            retries: 3
        });

        const data = z
            .object({
                entries: z.array(z.unknown()),
                pagination: z.object({
                    page: z.number(),
                    per_page: z.number(),
                    total: z.number(),
                    pages: z.number().optional().nullable()
                })
            })
            .parse(response.data);

        const entries = data.entries.map((entry) => CalendarEntrySchema.parse(entry));

        const hasMore = data.pagination.page * data.pagination.per_page < data.pagination.total;

        return {
            entries,
            ...(hasMore && { next_cursor: String(data.pagination.page + 1) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
