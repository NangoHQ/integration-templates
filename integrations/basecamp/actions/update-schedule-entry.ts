import { z } from 'zod';
import { createAction } from 'nango';

const RecurrenceScheduleInputSchema = z.object({
    frequency: z.string().describe('Recurrence frequency such as every_day, every_week, every_month, etc.'),
    days: z.array(z.number()).optional().describe('Days of the week (0-6) or day of month (1-31) depending on frequency.'),
    weekInstance: z.number().optional().describe('Week of the month (1-4, -1 for last) for monthly frequencies.'),
    weekInterval: z.number().optional().describe('Repeat every N weeks for custom_week frequency.'),
    monthInterval: z.number().optional().describe('Repeat every N months for custom_month frequency.')
});

const InputSchema = z
    .object({
        projectId: z.number().describe('The ID of the project containing the schedule entry.'),
        entryId: z.number().describe('The ID of the schedule entry to update.'),
        summary: z.string().describe('What this schedule entry is about.'),
        startsAt: z.string().describe('ISO 8601 date-time when the schedule entry begins.'),
        endsAt: z.string().describe('ISO 8601 date-time when the schedule entry ends.'),
        description: z.string().optional().describe('Rich-text description of the schedule entry. Omitting clears the existing description.'),
        participantIds: z
            .array(z.number())
            .optional()
            .describe('People IDs participating in this entry. Omitting keeps current participants; pass an empty array to remove all.'),
        allDay: z.boolean().optional().describe('Whether this is an all-day event with no specific start or end time.'),
        joinUrl: z
            .string()
            .optional()
            .describe('Video-call or join URL for the entry, up to 2500 characters. Omitting keeps the current link; pass an empty string to clear it.'),
        highlighted: z
            .boolean()
            .optional()
            .describe('Whether the entry is highlighted on the schedule. Omitting keeps the current state; pass false to remove the highlight.'),
        notify: z.boolean().optional().describe('Whether to notify participants about the update.'),
        recurrenceSchedule: RecurrenceScheduleInputSchema.optional().describe('Recurrence rules to make the entry repeat.'),
        recursUntil: z.string().optional().describe('ISO 8601 date when recurrence ends. Omit for indefinite recurrence.'),
        visibleToClients: z.boolean().optional().describe('Whether the entry is visible to project clients when clients are enabled.'),
        status: z.string().optional().describe('Entry status: active or drafted.')
    })
    .describe(
        'Fields to update on an existing Basecamp schedule entry. Most fields are optional, but omitting them clears the existing value on the server except for participantIds, joinUrl, and highlighted.'
    );

const ParticipantSchema = z.object({
    id: z.number().describe('Person ID.'),
    name: z.string().describe('Person name.'),
    emailAddress: z.string().optional().describe('Email address, if exposed by the provider.')
});

const ParentScheduleSchema = z.object({
    id: z.number().describe('Schedule ID.'),
    title: z.string().describe('Schedule title.'),
    type: z.string().describe('Schedule type.')
});

const BucketSchema = z.object({
    id: z.number().describe('Project ID.'),
    name: z.string().describe('Project name.'),
    type: z.string().describe('Project type.')
});

const OutputSchema = z
    .object({
        id: z.number().describe('The ID of the schedule entry.'),
        status: z.string().describe('The status of the schedule entry (active or drafted).'),
        createdAt: z.string().describe('ISO 8601 timestamp when the entry was created.'),
        updatedAt: z.string().describe('ISO 8601 timestamp when the entry was last updated.'),
        summary: z.string().describe('What this schedule entry is about.'),
        description: z.string().optional().describe('Rich-text description of the schedule entry.'),
        allDay: z.boolean().describe('Whether this is an all-day event.'),
        highlighted: z.boolean().describe('Whether the entry is highlighted on the schedule.'),
        startsAt: z.string().describe('ISO 8601 date-time when the schedule entry begins.'),
        endsAt: z.string().describe('ISO 8601 date-time when the schedule entry ends.'),
        joinUrl: z.string().nullable().describe('Video-call or join URL for the entry.'),
        participants: z.array(ParticipantSchema).describe('People participating in this entry.'),
        parent: ParentScheduleSchema.describe('The parent schedule containing this entry.'),
        bucket: BucketSchema.describe('The project containing this entry.'),
        url: z.string().describe('The API URL for this schedule entry.'),
        appUrl: z.string().describe('The Basecamp app URL for this schedule entry.')
    })
    .describe('The updated Basecamp schedule entry with its current fields and nested parent project and schedule.');

const ProviderParticipantSchema = z.object({
    id: z.number(),
    name: z.string(),
    email_address: z.string().nullable().optional()
});

const ProviderParentSchema = z.object({
    id: z.number(),
    title: z.string(),
    type: z.string()
});

const ProviderBucketSchema = z.object({
    id: z.number(),
    name: z.string(),
    type: z.string()
});

const ProviderScheduleEntrySchema = z.object({
    id: z.number(),
    status: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    summary: z.string(),
    description: z.string().optional(),
    all_day: z.boolean(),
    highlighted: z.boolean(),
    starts_at: z.string(),
    ends_at: z.string(),
    join_url: z.string().nullable(),
    participants: z.array(ProviderParticipantSchema).optional(),
    parent: ProviderParentSchema,
    bucket: ProviderBucketSchema,
    url: z.string(),
    app_url: z.string()
});

/**
 * @tags: [write]
 * @tagReason: Updates an existing schedule entry via PUT.
 * @pitfalls: Basecamp treats this PUT as a full replacement: most omitted fields are cleared on the server, so callers must include the full desired set. Recurring entries cannot be updated through this endpoint and instead redirect to the first occurrence.
 */
const action = createAction({
    description: "Update a schedule entry's summary, times, or other fields.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const payload: Record<string, unknown> = {
            summary: input.summary,
            starts_at: input.startsAt,
            ends_at: input.endsAt
        };

        if (input.description !== undefined) {
            payload['description'] = input.description;
        }

        if (input.participantIds !== undefined) {
            payload['participant_ids'] = input.participantIds;
        }

        if (input.allDay !== undefined) {
            payload['all_day'] = input.allDay;
        }

        if (input.joinUrl !== undefined) {
            payload['url'] = input.joinUrl;
        }

        if (input.highlighted !== undefined) {
            payload['highlighted'] = input.highlighted;
        }

        if (input.notify !== undefined) {
            payload['notify'] = input.notify;
        }

        if (input.recurrenceSchedule !== undefined) {
            payload['recurrence_schedule'] = {
                frequency: input.recurrenceSchedule.frequency,
                ...(input.recurrenceSchedule.days !== undefined && { days: input.recurrenceSchedule.days }),
                ...(input.recurrenceSchedule.weekInstance !== undefined && { week_instance: input.recurrenceSchedule.weekInstance }),
                ...(input.recurrenceSchedule.weekInterval !== undefined && { week_interval: input.recurrenceSchedule.weekInterval }),
                ...(input.recurrenceSchedule.monthInterval !== undefined && { month_interval: input.recurrenceSchedule.monthInterval })
            };
        }

        if (input.recursUntil !== undefined) {
            payload['recurs_until'] = input.recursUntil;
        }

        if (input.visibleToClients !== undefined) {
            payload['visible_to_clients'] = input.visibleToClients;
        }

        if (input.status !== undefined) {
            payload['status'] = input.status;
        }

        // https://raw.githubusercontent.com/basecamp/bc3-api/master/sections/schedule_entries.md
        const response = await nango.put({
            endpoint: `/buckets/${encodeURIComponent(input.projectId)}/schedule_entries/${encodeURIComponent(input.entryId)}.json`,
            data: payload,
            retries: 3
        });

        const providerEntry = ProviderScheduleEntrySchema.parse(response.data);

        return {
            id: providerEntry.id,
            status: providerEntry.status,
            createdAt: providerEntry.created_at,
            updatedAt: providerEntry.updated_at,
            summary: providerEntry.summary,
            description: providerEntry.description,
            allDay: providerEntry.all_day,
            highlighted: providerEntry.highlighted,
            startsAt: providerEntry.starts_at,
            endsAt: providerEntry.ends_at,
            joinUrl: providerEntry.join_url,
            participants: (providerEntry.participants || []).map((p) => ({
                id: p.id,
                name: p.name,
                ...(p.email_address != null && { emailAddress: p.email_address })
            })),
            parent: {
                id: providerEntry.parent.id,
                title: providerEntry.parent.title,
                type: providerEntry.parent.type
            },
            bucket: {
                id: providerEntry.bucket.id,
                name: providerEntry.bucket.name,
                type: providerEntry.bucket.type
            },
            url: providerEntry.url,
            appUrl: providerEntry.app_url
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
