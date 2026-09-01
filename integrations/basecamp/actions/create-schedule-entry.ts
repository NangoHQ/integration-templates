import { z } from 'zod';
import { createAction } from 'nango';

const RecurrenceScheduleSchema = z.object({
    frequency: z
        .enum([
            'every_day',
            'every_weekday',
            'every_week',
            'every_other_week',
            'every_month',
            'every_day_of_month',
            'every_year',
            'custom_week',
            'custom_month'
        ])
        .describe('Recurrence frequency'),
    days: z.array(z.number()).optional().describe('Days of the week or month for recurrence'),
    week_instance: z.number().optional().describe('Week of the month for recurrence, 1 to 4 or -1 for last week'),
    week_interval: z.number().optional().describe('Repeat every N weeks for custom_week frequency'),
    month_interval: z.number().optional().describe('Repeat every N months for custom_month frequency')
});

const ParticipantSchema = z.object({
    id: z.number().describe('Person ID'),
    name: z.string().describe('Person name'),
    email_address: z.string().optional().describe('Person email address, omitted for some integration-type people')
});

const ProviderParticipantSchema = z.object({
    id: z.number(),
    name: z.string(),
    email_address: z.string().nullable().optional()
});

const ParentSchema = z.object({
    id: z.number().describe('Parent schedule ID'),
    title: z.string().describe('Parent schedule title'),
    type: z.string().describe('Parent type, e.g., "Schedule"'),
    url: z.string().describe('Parent API URL'),
    app_url: z.string().describe('Parent app URL')
});

const BucketSchema = z.object({
    id: z.number().describe('Project ID'),
    name: z.string().describe('Project name'),
    type: z.string().describe('Bucket type, e.g., "Project"')
});

const CreatorSchema = z.object({
    id: z.number().describe('Creator person ID'),
    name: z.string().describe('Creator name'),
    email_address: z.string().optional().describe('Creator email address, omitted for some integration-type people'),
    avatar_url: z.string().optional().describe('Creator avatar URL')
});

const ProviderCreatorSchema = z.object({
    id: z.number(),
    name: z.string(),
    email_address: z.string().nullable().optional(),
    avatar_url: z.string().optional()
});

const InputSchema = z
    .object({
        projectId: z.string().describe('Project ID (bucket) that contains the schedule'),
        scheduleId: z.string().describe('Schedule ID under which to create the entry'),
        summary: z.string().describe('What this schedule entry is about'),
        starts_at: z.string().describe('ISO 8601 date-time when the schedule entry begins'),
        ends_at: z.string().describe('ISO 8601 date-time when the schedule entry ends'),
        description: z.string().optional().describe('Rich-text description of the schedule entry'),
        participant_ids: z.array(z.number()).optional().describe('Array of people IDs that will participate in this entry'),
        all_day: z.boolean().optional().describe('When true, the entry spans the entire day(s)'),
        url: z.string().optional().describe('Join link for the entry, such as a video-call URL'),
        highlighted: z.boolean().optional().describe('When true, the entry is highlighted on the schedule'),
        notify: z.boolean().optional().describe('When true, notifies participants about the entry'),
        recurrence_schedule: RecurrenceScheduleSchema.optional().describe('Recurrence configuration for the entry'),
        recurs_until: z.string().optional().describe('ISO 8601 date when the recurrence ends'),
        status: z.string().optional().describe('Pass "drafted" to create as a draft; default is published/active')
    })
    .describe('Input for creating a schedule entry on a Basecamp project schedule');

const OutputSchema = z
    .object({
        id: z.number().describe('Created schedule entry ID'),
        status: z.string().describe('Entry status, e.g., "active" or "drafted"'),
        visible_to_clients: z.boolean().describe('Whether the entry is visible to clients'),
        created_at: z.string().describe('ISO 8601 timestamp when the entry was created'),
        updated_at: z.string().describe('ISO 8601 timestamp when the entry was last updated'),
        title: z.string().describe('Entry title, same as summary'),
        inherits_status: z.boolean().describe('Whether the entry inherits status from its parent'),
        type: z.string().describe('Type identifier, e.g., "Schedule::Entry"'),
        url: z.string().describe('API URL of the entry'),
        app_url: z.string().describe('App URL of the entry'),
        summary: z.string().describe('What this schedule entry is about'),
        description: z.string().optional().describe('Rich-text description of the entry'),
        all_day: z.boolean().describe('Whether the entry spans the entire day'),
        highlighted: z.boolean().describe('Whether the entry is highlighted on the schedule'),
        starts_at: z.string().describe('ISO 8601 date-time when the entry begins'),
        ends_at: z.string().describe('ISO 8601 date-time when the entry ends'),
        join_url: z.string().nullable().describe('Join link for the entry, null if not set'),
        participants: z.array(ParticipantSchema).describe('People participating in this entry'),
        parent: ParentSchema.describe('Parent schedule object'),
        bucket: BucketSchema.describe('Project (bucket) containing this entry'),
        creator: CreatorSchema.describe('Person who created this entry'),
        recurrence_schedule: RecurrenceScheduleSchema.optional().describe('Recurrence configuration if the entry repeats')
    })
    .describe('Output of a newly created Basecamp schedule entry');

const ProviderScheduleEntrySchema = z.object({
    id: z.number(),
    status: z.string(),
    visible_to_clients: z.boolean(),
    created_at: z.string(),
    updated_at: z.string(),
    title: z.string(),
    inherits_status: z.boolean(),
    type: z.string(),
    url: z.string(),
    app_url: z.string(),
    summary: z.string(),
    description: z.string().optional(),
    all_day: z.boolean(),
    highlighted: z.boolean(),
    starts_at: z.string(),
    ends_at: z.string(),
    join_url: z.string().nullable(),
    participants: z.array(ProviderParticipantSchema),
    parent: ParentSchema,
    bucket: BucketSchema,
    creator: ProviderCreatorSchema,
    recurrence_schedule: RecurrenceScheduleSchema.optional()
});

/**
 * @tags: [write]
 * @tagReason: Creates a new schedule entry on a project's schedule via a POST mutation.
 * @pitfalls: Default status is published (active), unlike messages and documents which default to drafts. recurrence_schedule.frequency is validated against Basecamp's documented enum before the request is sent; other invalid recurrence_schedule fields are still silently discarded by Basecamp and the entry is created non-recurring. The input url field is returned as join_url; the top-level url is the API URL. starts_at and ends_at are normalized to UTC in the response even if sent with a non-UTC offset.
 */
const action = createAction({
    description: 'Create a schedule entry on a project schedule',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {
            summary: input.summary,
            starts_at: input.starts_at,
            ends_at: input.ends_at
        };

        if (input.description !== undefined) {
            body['description'] = input.description;
        }
        if (input.participant_ids !== undefined) {
            body['participant_ids'] = input.participant_ids;
        }
        if (input.all_day !== undefined) {
            body['all_day'] = input.all_day;
        }
        if (input.url !== undefined) {
            body['url'] = input.url;
        }
        if (input.highlighted !== undefined) {
            body['highlighted'] = input.highlighted;
        }
        if (input.notify !== undefined) {
            body['notify'] = input.notify;
        }
        if (input.recurrence_schedule !== undefined) {
            body['recurrence_schedule'] = input.recurrence_schedule;
        }
        if (input.recurs_until !== undefined) {
            body['recurs_until'] = input.recurs_until;
        }
        if (input.status !== undefined) {
            body['status'] = input.status;
        }

        // https://github.com/basecamp/bc3-api/blob/master/sections/schedule_entries.md#create-a-schedule-entry
        const response = await nango.post({
            endpoint: `/buckets/${encodeURIComponent(input.projectId)}/schedules/${encodeURIComponent(input.scheduleId)}/entries.json`,
            data: body,
            retries: 3
        });

        const providerEntry = ProviderScheduleEntrySchema.parse(response.data);

        return {
            id: providerEntry.id,
            status: providerEntry.status,
            visible_to_clients: providerEntry.visible_to_clients,
            created_at: providerEntry.created_at,
            updated_at: providerEntry.updated_at,
            title: providerEntry.title,
            inherits_status: providerEntry.inherits_status,
            type: providerEntry.type,
            url: providerEntry.url,
            app_url: providerEntry.app_url,
            summary: providerEntry.summary,
            ...(providerEntry.description !== undefined && { description: providerEntry.description }),
            all_day: providerEntry.all_day,
            highlighted: providerEntry.highlighted,
            starts_at: providerEntry.starts_at,
            ends_at: providerEntry.ends_at,
            join_url: providerEntry.join_url,
            participants: providerEntry.participants.map((participant) => ({
                id: participant.id,
                name: participant.name,
                ...(participant.email_address != null && { email_address: participant.email_address })
            })),
            parent: providerEntry.parent,
            bucket: providerEntry.bucket,
            creator: {
                id: providerEntry.creator.id,
                name: providerEntry.creator.name,
                ...(providerEntry.creator.email_address != null && { email_address: providerEntry.creator.email_address }),
                ...(providerEntry.creator.avatar_url !== undefined && { avatar_url: providerEntry.creator.avatar_url })
            },
            ...(providerEntry.recurrence_schedule !== undefined && { recurrence_schedule: providerEntry.recurrence_schedule })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
