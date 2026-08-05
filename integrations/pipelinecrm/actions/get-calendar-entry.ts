import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('Calendar entry ID. Example: 355945527')
});

const ProviderOwnerSchema = z.object({
    id: z.number(),
    full_name: z.string().nullable().optional()
});

const ProviderCategorySchema = z.object({
    id: z.number(),
    name: z.string().nullable().optional()
});

const ProviderPrioritySchema = z.object({
    id: z.number(),
    name: z.string().nullable().optional(),
    hex_color: z.string().nullable().optional(),
    position: z.number().nullable().optional()
});

const ProviderStatusSchema = z.object({
    id: z.number(),
    name: z.string().nullable().optional(),
    hex_color: z.string().nullable().optional(),
    position: z.number().nullable().optional()
});

const ProviderCalendarEntrySchema = z
    .object({
        id: z.number(),
        type: z.string().nullable().optional(),
        name: z.string().nullable().optional(),
        description: z.string().nullable().optional(),
        start_time: z.string().nullable().optional(),
        end_time: z.string().nullable().optional(),
        all_day: z.boolean().nullable().optional(),
        due_date: z.string().nullable().optional(),
        complete: z.boolean().nullable().optional(),
        completed_at: z.string().nullable().optional(),
        association_id: z.number().nullable().optional(),
        association_type: z.string().nullable().optional(),
        active: z.boolean().nullable().optional(),
        company_id: z.number().nullable().optional(),
        owner_id: z.number().nullable().optional(),
        owner: ProviderOwnerSchema.nullable().optional(),
        category_id: z.number().nullable().optional(),
        category: ProviderCategorySchema.nullable().optional(),
        base_entry_id: z.number().nullable().optional(),
        google_calendar_id: z.string().nullable().optional(),
        part_of_recurring_series: z.boolean().nullable().optional(),
        recurrence_end: z.string().nullable().optional(),
        rrule: z.string().nullable().optional(),
        rdate: z.string().nullable().optional(),
        exrule: z.string().nullable().optional(),
        exdate: z.string().nullable().optional(),
        calendar_entry_priority_id: z.number().nullable().optional(),
        calendar_entry_priority: ProviderPrioritySchema.nullable().optional(),
        calendar_entry_status_id: z.number().nullable().optional(),
        calendar_entry_status: ProviderStatusSchema.nullable().optional(),
        created_at: z.string().nullable().optional(),
        updated_at: z.string().nullable().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.number(),
    type: z.string().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    start_time: z.string().optional(),
    end_time: z.string().optional(),
    all_day: z.boolean().optional(),
    due_date: z.string().optional(),
    complete: z.boolean().optional(),
    completed_at: z.string().optional(),
    association_id: z.number().optional(),
    association_type: z.string().optional(),
    active: z.boolean().optional(),
    company_id: z.number().optional(),
    owner_id: z.number().optional(),
    owner: ProviderOwnerSchema.optional(),
    category_id: z.number().optional(),
    category: ProviderCategorySchema.optional(),
    base_entry_id: z.number().optional(),
    google_calendar_id: z.string().optional(),
    part_of_recurring_series: z.boolean().optional(),
    recurrence_end: z.string().optional(),
    rrule: z.string().optional(),
    rdate: z.string().optional(),
    exrule: z.string().optional(),
    exdate: z.string().optional(),
    calendar_entry_priority_id: z.number().optional(),
    calendar_entry_priority: ProviderPrioritySchema.optional(),
    calendar_entry_status_id: z.number().optional(),
    calendar_entry_status: ProviderStatusSchema.optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const action = createAction({
    description: 'Get a single calendar entry (task or event) by id.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://app.pipelinecrm.com/api/docs/introduction
            endpoint: `api/v3/calendar_entries/${encodeURIComponent(String(input.id))}`,
            retries: 3
        });

        if (response.status === 404) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'That calendar entry can not be found. Maybe it was deleted?',
                id: input.id
            });
        }

        const raw = response.data;
        if (!raw || typeof raw !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from provider',
                id: input.id
            });
        }

        const entry = ProviderCalendarEntrySchema.parse(raw);

        return {
            id: entry.id,
            ...(entry.type != null && { type: entry.type }),
            ...(entry.name != null && { name: entry.name }),
            ...(entry.description != null && { description: entry.description }),
            ...(entry.start_time != null && { start_time: entry.start_time }),
            ...(entry.end_time != null && { end_time: entry.end_time }),
            ...(entry.all_day != null && { all_day: entry.all_day }),
            ...(entry.due_date != null && { due_date: entry.due_date }),
            ...(entry.complete != null && { complete: entry.complete }),
            ...(entry.completed_at != null && { completed_at: entry.completed_at }),
            ...(entry.association_id != null && { association_id: entry.association_id }),
            ...(entry.association_type != null && { association_type: entry.association_type }),
            ...(entry.active != null && { active: entry.active }),
            ...(entry.company_id != null && { company_id: entry.company_id }),
            ...(entry.owner_id != null && { owner_id: entry.owner_id }),
            ...(entry.owner != null && { owner: entry.owner }),
            ...(entry.category_id != null && { category_id: entry.category_id }),
            ...(entry.category != null && { category: entry.category }),
            ...(entry.base_entry_id != null && { base_entry_id: entry.base_entry_id }),
            ...(entry.google_calendar_id != null && { google_calendar_id: entry.google_calendar_id }),
            ...(entry.part_of_recurring_series != null && { part_of_recurring_series: entry.part_of_recurring_series }),
            ...(entry.recurrence_end != null && { recurrence_end: entry.recurrence_end }),
            ...(entry.rrule != null && { rrule: entry.rrule }),
            ...(entry.rdate != null && { rdate: entry.rdate }),
            ...(entry.exrule != null && { exrule: entry.exrule }),
            ...(entry.exdate != null && { exdate: entry.exdate }),
            ...(entry.calendar_entry_priority_id != null && { calendar_entry_priority_id: entry.calendar_entry_priority_id }),
            ...(entry.calendar_entry_priority != null && { calendar_entry_priority: entry.calendar_entry_priority }),
            ...(entry.calendar_entry_status_id != null && { calendar_entry_status_id: entry.calendar_entry_status_id }),
            ...(entry.calendar_entry_status != null && { calendar_entry_status: entry.calendar_entry_status }),
            ...(entry.created_at != null && { created_at: entry.created_at }),
            ...(entry.updated_at != null && { updated_at: entry.updated_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
