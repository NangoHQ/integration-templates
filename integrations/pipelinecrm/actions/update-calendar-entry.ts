import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('Calendar entry ID. Example: 355945527'),
    name: z.string().optional().describe('The name of the task/event.'),
    description: z.string().optional().describe('A more detailed description of the event.'),
    complete: z.boolean().optional().describe('Whether the task is complete.'),
    due_date: z.string().optional().describe('Tasks only. The due date. Example: 2025-01-01'),
    start_time: z.string().optional().describe('For CalendarEvent only. The start time. Example: 2012-06-13 11:47:15'),
    end_time: z.string().optional().describe('For CalendarEvent only. The end time. Example: 2012-06-13 11:47:15'),
    all_day: z.boolean().optional().describe('Whether this event is all day.'),
    category_id: z.number().optional().describe('The event category ID.'),
    association_id: z.number().optional().describe('The id of the associated person, company, or deal.'),
    association_type: z.enum(['Deal', 'Company', 'Person']).optional().describe('The type of association.'),
    active: z.boolean().optional().describe('Whether the entry is active. Inactive events are functionally equivalent to deleted.'),
    company_id: z.number().optional().describe('If this event is tied directly with a company, the company id.'),
    calendar_entry_priority_id: z.number().optional().describe('The event priority ID.'),
    calendar_entry_status_id: z.number().optional().describe('The event status ID.'),
    type: z.enum(['CalendarEvent', 'CalendarTask']).optional().describe('The type of calendar entry.'),
    rrule: z.string().optional().describe('Recurrence rule following iCalendar RFC2445.'),
    rdate: z.string().optional().describe('Recurrence date following iCalendar RFC2445.'),
    exrule: z.string().optional().describe('Exception rule following iCalendar RFC2445.'),
    exdate: z.string().optional().describe('Exception date following iCalendar RFC2445.')
});

const OwnerSchema = z
    .object({
        id: z.number(),
        full_name: z.string().nullish()
    })
    .nullish();

const CategorySchema = z
    .object({
        id: z.number(),
        name: z.string().nullish()
    })
    .nullish();

const PrioritySchema = z
    .object({
        id: z.number(),
        name: z.string().nullish(),
        hex_color: z.string().nullish(),
        position: z.number().nullish()
    })
    .nullish();

const StatusSchema = z
    .object({
        id: z.number(),
        name: z.string().nullish(),
        hex_color: z.string().nullish(),
        position: z.number().nullish()
    })
    .nullish();

const ProviderCalendarEntrySchema = z.object({
    id: z.number(),
    type: z.enum(['CalendarEvent', 'CalendarTask']).nullish(),
    category_id: z.number().nullish(),
    category: CategorySchema,
    name: z.string().nullish(),
    description: z.string().nullish(),
    start_time: z.string().nullish(),
    end_time: z.string().nullish(),
    all_day: z.boolean().nullish(),
    due_date: z.string().nullish(),
    complete: z.boolean().nullish(),
    completed_at: z.string().nullish(),
    association_id: z.number().nullish(),
    association_type: z.enum(['Deal', 'Company', 'Person']).nullish(),
    active: z.boolean().nullish(),
    company_id: z.number().nullish(),
    owner_id: z.number().nullish(),
    owner: OwnerSchema,
    base_entry_id: z.number().nullish(),
    google_calendar_id: z.string().nullish(),
    part_of_recurring_series: z.boolean().nullish(),
    recurrence_end: z.string().nullish(),
    calendar_entry_priority_id: z.number().nullish(),
    calendar_entry_priority: PrioritySchema,
    calendar_entry_status_id: z.number().nullish(),
    calendar_entry_status: StatusSchema,
    rrule: z.string().nullish(),
    rdate: z.string().nullish(),
    exrule: z.string().nullish(),
    exdate: z.string().nullish(),
    created_at: z.string().nullish(),
    updated_at: z.string().nullish()
});

const OutputSchema = z.object({
    id: z.number(),
    type: z.enum(['CalendarEvent', 'CalendarTask']).optional(),
    category_id: z.number().optional(),
    category: z
        .object({
            id: z.number(),
            name: z.string().optional()
        })
        .optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    start_time: z.string().optional(),
    end_time: z.string().optional(),
    all_day: z.boolean().optional(),
    due_date: z.string().optional(),
    complete: z.boolean().optional(),
    completed_at: z.string().optional(),
    association_id: z.number().optional(),
    association_type: z.enum(['Deal', 'Company', 'Person']).optional(),
    active: z.boolean().optional(),
    company_id: z.number().optional(),
    owner_id: z.number().optional(),
    owner: z
        .object({
            id: z.number(),
            full_name: z.string().optional()
        })
        .optional(),
    base_entry_id: z.number().optional(),
    google_calendar_id: z.string().optional(),
    part_of_recurring_series: z.boolean().optional(),
    recurrence_end: z.string().optional(),
    calendar_entry_priority_id: z.number().optional(),
    calendar_entry_priority: z
        .object({
            id: z.number(),
            name: z.string().optional(),
            hex_color: z.string().optional(),
            position: z.number().optional()
        })
        .optional(),
    calendar_entry_status_id: z.number().optional(),
    calendar_entry_status: z
        .object({
            id: z.number(),
            name: z.string().optional(),
            hex_color: z.string().optional(),
            position: z.number().optional()
        })
        .optional(),
    rrule: z.string().optional(),
    rdate: z.string().optional(),
    exrule: z.string().optional(),
    exdate: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const action = createAction({
    description: 'Update a calendar entry, e.g. mark a task complete.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const payload: {
            name?: string;
            description?: string;
            complete?: boolean;
            due_date?: string;
            start_time?: string;
            end_time?: string;
            all_day?: boolean;
            category_id?: number;
            association_id?: number;
            association_type?: 'Deal' | 'Company' | 'Person';
            active?: boolean;
            company_id?: number;
            calendar_entry_priority_id?: number;
            calendar_entry_status_id?: number;
            type?: 'CalendarEvent' | 'CalendarTask';
            rrule?: string;
            rdate?: string;
            exrule?: string;
            exdate?: string;
        } = {};

        if (input.name !== undefined) {
            payload.name = input.name;
        }
        if (input.description !== undefined) {
            payload.description = input.description;
        }
        if (input.complete !== undefined) {
            payload.complete = input.complete;
        }
        if (input.due_date !== undefined) {
            payload.due_date = input.due_date;
        }
        if (input.start_time !== undefined) {
            payload.start_time = input.start_time;
        }
        if (input.end_time !== undefined) {
            payload.end_time = input.end_time;
        }
        if (input.all_day !== undefined) {
            payload.all_day = input.all_day;
        }
        if (input.category_id !== undefined) {
            payload.category_id = input.category_id;
        }
        if (input.association_id !== undefined) {
            payload.association_id = input.association_id;
        }
        if (input.association_type !== undefined) {
            payload.association_type = input.association_type;
        }
        if (input.active !== undefined) {
            payload.active = input.active;
        }
        if (input.company_id !== undefined) {
            payload.company_id = input.company_id;
        }
        if (input.calendar_entry_priority_id !== undefined) {
            payload.calendar_entry_priority_id = input.calendar_entry_priority_id;
        }
        if (input.calendar_entry_status_id !== undefined) {
            payload.calendar_entry_status_id = input.calendar_entry_status_id;
        }
        if (input.type !== undefined) {
            payload.type = input.type;
        }
        if (input.rrule !== undefined) {
            payload.rrule = input.rrule;
        }
        if (input.rdate !== undefined) {
            payload.rdate = input.rdate;
        }
        if (input.exrule !== undefined) {
            payload.exrule = input.exrule;
        }
        if (input.exdate !== undefined) {
            payload.exdate = input.exdate;
        }

        // https://app.pipelinecrm.com/openapi.yaml
        const response = await nango.put({
            endpoint: `/api/v3/calendar_entries/${encodeURIComponent(String(input.id))}`,
            data: {
                calendar_entry: payload
            },
            retries: 3
        });

        const providerEntry = ProviderCalendarEntrySchema.parse(response.data);

        return {
            id: providerEntry.id,
            ...(providerEntry.type != null && { type: providerEntry.type }),
            ...(providerEntry.category_id != null && { category_id: providerEntry.category_id }),
            ...(providerEntry.category != null && {
                category: {
                    id: providerEntry.category.id,
                    ...(providerEntry.category.name != null && { name: providerEntry.category.name })
                }
            }),
            ...(providerEntry.name != null && { name: providerEntry.name }),
            ...(providerEntry.description != null && { description: providerEntry.description }),
            ...(providerEntry.start_time != null && { start_time: providerEntry.start_time }),
            ...(providerEntry.end_time != null && { end_time: providerEntry.end_time }),
            ...(providerEntry.all_day != null && { all_day: providerEntry.all_day }),
            ...(providerEntry.due_date != null && { due_date: providerEntry.due_date }),
            ...(providerEntry.complete != null && { complete: providerEntry.complete }),
            ...(providerEntry.completed_at != null && { completed_at: providerEntry.completed_at }),
            ...(providerEntry.association_id != null && { association_id: providerEntry.association_id }),
            ...(providerEntry.association_type != null && { association_type: providerEntry.association_type }),
            ...(providerEntry.active != null && { active: providerEntry.active }),
            ...(providerEntry.company_id != null && { company_id: providerEntry.company_id }),
            ...(providerEntry.owner_id != null && { owner_id: providerEntry.owner_id }),
            ...(providerEntry.owner != null && {
                owner: {
                    id: providerEntry.owner.id,
                    ...(providerEntry.owner.full_name != null && { full_name: providerEntry.owner.full_name })
                }
            }),
            ...(providerEntry.base_entry_id != null && { base_entry_id: providerEntry.base_entry_id }),
            ...(providerEntry.google_calendar_id != null && { google_calendar_id: providerEntry.google_calendar_id }),
            ...(providerEntry.part_of_recurring_series != null && { part_of_recurring_series: providerEntry.part_of_recurring_series }),
            ...(providerEntry.recurrence_end != null && { recurrence_end: providerEntry.recurrence_end }),
            ...(providerEntry.calendar_entry_priority_id != null && { calendar_entry_priority_id: providerEntry.calendar_entry_priority_id }),
            ...(providerEntry.calendar_entry_priority != null && {
                calendar_entry_priority: {
                    id: providerEntry.calendar_entry_priority.id,
                    ...(providerEntry.calendar_entry_priority.name != null && { name: providerEntry.calendar_entry_priority.name }),
                    ...(providerEntry.calendar_entry_priority.hex_color != null && { hex_color: providerEntry.calendar_entry_priority.hex_color }),
                    ...(providerEntry.calendar_entry_priority.position != null && { position: providerEntry.calendar_entry_priority.position })
                }
            }),
            ...(providerEntry.calendar_entry_status_id != null && { calendar_entry_status_id: providerEntry.calendar_entry_status_id }),
            ...(providerEntry.calendar_entry_status != null && {
                calendar_entry_status: {
                    id: providerEntry.calendar_entry_status.id,
                    ...(providerEntry.calendar_entry_status.name != null && { name: providerEntry.calendar_entry_status.name }),
                    ...(providerEntry.calendar_entry_status.hex_color != null && { hex_color: providerEntry.calendar_entry_status.hex_color }),
                    ...(providerEntry.calendar_entry_status.position != null && { position: providerEntry.calendar_entry_status.position })
                }
            }),
            ...(providerEntry.rrule != null && { rrule: providerEntry.rrule }),
            ...(providerEntry.rdate != null && { rdate: providerEntry.rdate }),
            ...(providerEntry.exrule != null && { exrule: providerEntry.exrule }),
            ...(providerEntry.exdate != null && { exdate: providerEntry.exdate }),
            ...(providerEntry.created_at != null && { created_at: providerEntry.created_at }),
            ...(providerEntry.updated_at != null && { updated_at: providerEntry.updated_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
