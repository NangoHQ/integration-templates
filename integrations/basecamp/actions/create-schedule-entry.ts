import { z } from 'zod';
import { createAction } from 'nango';

const RecurrenceScheduleSchema = z.object({
    frequency: z
        .enum(['every_day', 'every_weekday', 'every_week', 'every_other_week', 'every_month', 'every_day_of_month', 'every_year', 'custom_week', 'custom_month'])
        .describe('Recurrence frequency'),
    days: z.array(z.number()).optional().describe('Days of the week or month for recurrence'),
    week_instance: z.number().optional().describe('Week of the month for recurrence, 1 to 4 or -1 for last week'),
    week_interval: z.number().optional().describe('Repeat every N weeks for custom_week frequency'),
    month_interval: z.number().optional().describe('Repeat every N months for custom_month frequency')
});

const ParticipantSchema = z.object({
    id: z.number().describe('Person ID'),
    name: z.string().describe('Person name'),
    email_address: z.string().nullable().describe('Person email address')
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
    email_address: z.string().nullable().describe('Creator email address'),
    avatar_url: z.string().optional().describe('Creator avatar URL')
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

        const parsed = OutputSchema.parse(response.data);
        return parsed;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
