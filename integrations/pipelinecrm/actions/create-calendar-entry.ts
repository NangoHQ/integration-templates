import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    type: z.enum(['CalendarTask', 'CalendarEvent']).describe('Type of calendar entry'),
    category_id: z.number().describe('Event category ID from list-event-categories'),
    name: z.string().describe('Name of the task or event'),
    due_date: z.string().optional().describe('Due date for tasks. Example: 2026-08-10'),
    start_time: z.string().optional().describe('Start time for events. Example: 2026-08-10 10:00:00'),
    end_time: z.string().optional().describe('End time for events. Example: 2026-08-10 11:00:00'),
    association_id: z.number().describe('ID of the associated Deal, Company, or Person'),
    association_type: z.enum(['Deal', 'Company', 'Person']),
    description: z.string().optional(),
    complete: z.boolean().optional(),
    all_day: z.boolean().optional(),
    calendar_entry_priority_id: z.number().optional(),
    calendar_entry_status_id: z.number().optional()
});

const OwnerSchema = z.object({
    id: z.number(),
    full_name: z.string().nullish()
});

const CategorySchema = z.object({
    id: z.number(),
    name: z.string().nullish()
});

const PrioritySchema = z.object({
    id: z.number(),
    name: z.string().nullish(),
    hex_color: z.string().nullish(),
    position: z.number().nullish()
});

const StatusSchema = z.object({
    id: z.number(),
    name: z.string().nullish(),
    hex_color: z.string().nullish(),
    position: z.number().nullish()
});

const ProviderCalendarEntrySchema = z.object({
    id: z.number(),
    type: z.enum(['CalendarTask', 'CalendarEvent']),
    category_id: z.number().nullish(),
    name: z.string().nullish(),
    description: z.string().nullish(),
    start_time: z.string().nullish(),
    end_time: z.string().nullish(),
    all_day: z.boolean().nullish(),
    due_date: z.string().nullish(),
    complete: z.boolean().nullish(),
    completed_at: z.string().nullish(),
    association_id: z.number().nullish(),
    association_type: z.string().nullish(),
    active: z.boolean().nullish(),
    company_id: z.number().nullish(),
    owner_id: z.number().nullish(),
    owner: OwnerSchema.nullish(),
    category: CategorySchema.nullish(),
    base_entry_id: z.number().nullish(),
    google_calendar_id: z.string().nullish(),
    part_of_recurring_series: z.boolean().nullish(),
    recurrence_end: z.string().nullish(),
    calendar_entry_priority_id: z.number().nullish(),
    calendar_entry_status_id: z.number().nullish(),
    calendar_entry_priority: PrioritySchema.nullish(),
    calendar_entry_status: StatusSchema.nullish(),
    created_at: z.string().nullish(),
    updated_at: z.string().nullish()
});

const OutputSchema = z.object({
    id: z.number(),
    type: z.enum(['CalendarTask', 'CalendarEvent']),
    category_id: z.number().optional(),
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
    owner: OwnerSchema.optional(),
    category: CategorySchema.optional(),
    base_entry_id: z.number().optional(),
    google_calendar_id: z.string().optional(),
    part_of_recurring_series: z.boolean().optional(),
    recurrence_end: z.string().optional(),
    calendar_entry_priority_id: z.number().optional(),
    calendar_entry_status_id: z.number().optional(),
    calendar_entry_priority: PrioritySchema.optional(),
    calendar_entry_status: StatusSchema.optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const action = createAction({
    description: 'Create a new task or event',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://app.pipelinecrm.com/api/docs/introduction
            endpoint: '/calendar_entries.json',
            baseUrlOverride: 'https://api.pipelinecrm.com/api/v3',
            data: {
                calendar_entry: {
                    type: input.type,
                    category_id: input.category_id,
                    name: input.name,
                    association_id: input.association_id,
                    association_type: input.association_type,
                    ...(input.due_date !== undefined && { due_date: input.due_date }),
                    ...(input.start_time !== undefined && { start_time: input.start_time }),
                    ...(input.end_time !== undefined && { end_time: input.end_time }),
                    ...(input.description !== undefined && { description: input.description }),
                    ...(input.complete !== undefined && { complete: input.complete }),
                    ...(input.all_day !== undefined && { all_day: input.all_day }),
                    ...(input.calendar_entry_priority_id !== undefined && { calendar_entry_priority_id: input.calendar_entry_priority_id }),
                    ...(input.calendar_entry_status_id !== undefined && { calendar_entry_status_id: input.calendar_entry_status_id })
                }
            },
            retries: 3
        });

        const providerEntry = ProviderCalendarEntrySchema.parse(response.data);

        return {
            id: providerEntry.id,
            type: providerEntry.type,
            category_id: providerEntry.category_id ?? undefined,
            name: providerEntry.name ?? undefined,
            description: providerEntry.description ?? undefined,
            start_time: providerEntry.start_time ?? undefined,
            end_time: providerEntry.end_time ?? undefined,
            all_day: providerEntry.all_day ?? undefined,
            due_date: providerEntry.due_date ?? undefined,
            complete: providerEntry.complete ?? undefined,
            completed_at: providerEntry.completed_at ?? undefined,
            association_id: providerEntry.association_id ?? undefined,
            association_type: providerEntry.association_type ?? undefined,
            active: providerEntry.active ?? undefined,
            company_id: providerEntry.company_id ?? undefined,
            owner_id: providerEntry.owner_id ?? undefined,
            owner: providerEntry.owner ?? undefined,
            category: providerEntry.category ?? undefined,
            base_entry_id: providerEntry.base_entry_id ?? undefined,
            google_calendar_id: providerEntry.google_calendar_id ?? undefined,
            part_of_recurring_series: providerEntry.part_of_recurring_series ?? undefined,
            recurrence_end: providerEntry.recurrence_end ?? undefined,
            calendar_entry_priority_id: providerEntry.calendar_entry_priority_id ?? undefined,
            calendar_entry_status_id: providerEntry.calendar_entry_status_id ?? undefined,
            calendar_entry_priority: providerEntry.calendar_entry_priority ?? undefined,
            calendar_entry_status: providerEntry.calendar_entry_status ?? undefined,
            created_at: providerEntry.created_at ?? undefined,
            updated_at: providerEntry.updated_at ?? undefined
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
