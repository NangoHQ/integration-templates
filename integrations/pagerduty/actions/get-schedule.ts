import { z } from 'zod';
import { createAction } from 'nango';

const ScheduleUserSchema = z.object({
    id: z.string().describe('The unique identifier of the user.'),
    type: z.string().optional().describe('The type of the user reference.'),
    summary: z.string().optional().describe('A summary of the user.'),
    self: z.string().optional().describe('The API URL of the user resource.'),
    html_url: z.string().optional().describe('The PagerDuty web URL of the user resource.')
});

const ScheduleLayerUserSchema = z.object({
    user: ScheduleUserSchema.describe('A user reference within a schedule layer rotation.')
});

const ScheduleLayerSchema = z.object({
    id: z.string().optional().describe('The unique identifier of the schedule layer.'),
    type: z.string().optional().describe('The type of the schedule layer.'),
    name: z.string().describe('The name of the schedule layer.'),
    start: z.string().describe('The start time of the schedule layer in ISO 8601 format.'),
    end: z.string().nullable().optional().describe('The end time of the schedule layer in ISO 8601 format.'),
    rotation_virtual_start: z.string().describe('The virtual start time of the rotation in ISO 8601 format.'),
    rotation_turn_length_seconds: z.number().describe('The duration of each rotation turn in seconds.'),
    users: z.array(ScheduleLayerUserSchema).describe('The users assigned to this schedule layer in rotation order.'),
    restrictions: z.array(z.unknown()).optional().describe('Time-based restrictions applied to this layer.')
});

const RenderedScheduleEntrySchema = z.object({
    start: z.string().describe('The start time of this schedule entry in ISO 8601 format.'),
    end: z.string().describe('The end time of this schedule entry in ISO 8601 format.'),
    user: ScheduleUserSchema.describe('The user on-call during this schedule entry.')
});

const SubScheduleSchema = z.object({
    name: z.string().describe('The name of the sub-schedule.'),
    rendered_coverage_percentage: z.number().nullable().optional().describe('The percentage of time covered by rendered entries.'),
    rendered_schedule_entries: z.array(RenderedScheduleEntrySchema).describe('The rendered schedule entries for this sub-schedule.')
});

const OutputSchema = z
    .object({
        id: z.string().describe('The unique identifier of the schedule.'),
        type: z.string().optional().describe('The type of the resource.'),
        summary: z.string().optional().describe('A summary of the schedule.'),
        self: z.string().optional().describe('The API URL of this schedule resource.'),
        html_url: z.string().optional().describe('The PagerDuty web URL for this schedule.'),
        name: z.string().describe('The name of the schedule.'),
        description: z.string().nullable().optional().describe('A description of the schedule.'),
        time_zone: z.string().describe('The time zone in which the schedule is defined.'),
        schedule_layers: z.array(ScheduleLayerSchema).describe('The ordered layers defining user rotations for this schedule.'),
        final_schedule: SubScheduleSchema.optional().describe('The fully rendered schedule combining all layers.'),
        overrides_subschedule: SubScheduleSchema.optional().describe('The schedule showing only override entries.'),
        users: z.array(ScheduleUserSchema).describe('All users assigned to this schedule across all layers.'),
        teams: z.array(z.unknown()).optional().describe('Teams associated with this schedule.'),
        escalation_policies: z.array(z.unknown()).optional().describe('Escalation policies using this schedule.')
    })
    .describe('A PagerDuty schedule with its layers and assigned users.');

const InputSchema = z
    .object({
        id: z.string().describe('The unique identifier of the schedule to retrieve. Example: "P4QZ6G8"'),
        time_zone: z.string().optional().describe('The time zone to use when calculating the schedule. Example: "America/New_York"'),
        since: z.string().optional().describe('Start of the date range to query for schedule entries in ISO 8601 format. Example: "2026-09-01T00:00:00Z"'),
        until: z.string().optional().describe('End of the date range to query for schedule entries in ISO 8601 format. Example: "2026-09-30T00:00:00Z"'),
        overflow: z.boolean().optional().describe('Whether to include schedule entries that overflow the requested time range.')
    })
    .describe('Input for retrieving a single PagerDuty schedule.');

/**
 * @tags: [read]
 * @tagReason: Retrieves a single schedule from the PagerDuty API without modifying any data.
 * @pitfalls: The rendered_schedule_entries arrays in final_schedule and overrides_subschedule are populated only for the queried time window; omitting since and until may return empty arrays even when the schedule has active on-call coverage.
 */
const action = createAction({
    description: 'Retrieve a single schedule, including its layers and assigned users.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['schedules.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string> = {};
        if (input.time_zone !== undefined) {
            params['time_zone'] = input.time_zone;
        }
        if (input.since !== undefined) {
            params['since'] = input.since;
        }
        if (input.until !== undefined) {
            params['until'] = input.until;
        }
        if (input.overflow !== undefined) {
            params['overflow'] = String(input.overflow);
        }

        // https://developer.pagerduty.com/api-reference/reference/REST/openapiv3.json/tags/Schedules/paths/~1schedules~1%7Bid%7D/get
        const response = await nango.get({
            endpoint: `/schedules/${encodeURIComponent(input.id)}`,
            params,
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object' || !('schedule' in response.data)) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Schedule not found or unexpected response from PagerDuty.',
                schedule_id: input.id
            });
        }

        const scheduleData = z.object({ schedule: z.unknown() }).parse(response.data);
        const schedule = OutputSchema.parse(scheduleData.schedule);

        return schedule;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
