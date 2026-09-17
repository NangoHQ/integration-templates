import { z } from 'zod';
import { createAction } from 'nango';

const ScheduleLayerUserInputSchema = z.object({
    user: z
        .object({
            id: z.string().describe('User ID.'),
            type: z.string().describe('User reference type. Example: "user_reference".')
        })
        .describe('User reference for this layer.')
});

const RestrictionInputSchema = z.object({
    type: z.enum(['daily_restriction', 'weekly_restriction']).describe('Type of restriction.'),
    duration_seconds: z.number().describe('Duration of the restriction in seconds.'),
    start_time_of_day: z.string().describe('Start time in HH:mm:ss format.'),
    start_day_of_week: z.number().optional().describe('ISO 8601 day of week (1 is Monday). Required for weekly_restriction.')
});

const ScheduleLayerInputSchema = z.object({
    name: z.string().describe('Name of the schedule layer.'),
    start: z.string().describe('Start time of this layer in ISO 8601 format.'),
    end: z.string().optional().describe('End time of this layer in ISO 8601 format. If omitted, the layer does not end.'),
    rotation_virtual_start: z.string().describe('Effective start time of the layer in ISO 8601 format.'),
    rotation_turn_length_seconds: z.number().describe('Duration of each on-call shift in seconds.'),
    users: z.array(ScheduleLayerUserInputSchema).describe('Ordered list of users on this layer.'),
    restrictions: z.array(RestrictionInputSchema).optional().describe('Restrictions limiting when the layer can accept assignments.')
});

const ScheduleInputSchema = z.object({
    name: z.string().describe('Name of the schedule.'),
    type: z.literal('schedule').optional().describe('Type of object. Defaults to "schedule".'),
    time_zone: z.string().describe('Time zone of the schedule. Example: "America/New_York".'),
    description: z.string().optional().describe('Description of the schedule.'),
    schedule_layers: z.array(ScheduleLayerInputSchema).describe('List of schedule layers defining the rotation.')
});

const InputSchema = z
    .object({
        schedule: ScheduleInputSchema.describe('Schedule definition to preview. Same shape as create-schedule.'),
        since: z.string().optional().describe('Start of the preview date range in ISO 8601 format.'),
        until: z.string().optional().describe('End of the preview date range in ISO 8601 format.'),
        overflow: z.boolean().optional().describe('Whether to include schedule entries that cross the date range boundaries. Defaults to false.')
    })
    .describe('Input for previewing a schedule definition without saving it.');

const UserReferenceSchema = z.object({
    id: z.string().nullable().optional().describe('User ID.'),
    type: z.string().describe('Reference type. Example: "user_reference".'),
    summary: z.string().nullable().optional().describe('Short summary of the user.'),
    self: z.string().nullable().optional().describe('API URL of the user.'),
    html_url: z.string().nullable().optional().describe('Web app URL of the user.')
});

const ScheduleLayerEntrySchema = z.object({
    user: UserReferenceSchema.nullable().optional().describe('User assigned to this entry.'),
    start: z.string().describe('Start time of this entry in ISO 8601 format.'),
    end: z.string().describe('End time of this entry in ISO 8601 format.')
});

const SubScheduleSchema = z.object({
    name: z.string().describe('Name of the subschedule. Example: "Final Schedule" or "Overrides".'),
    rendered_schedule_entries: z.array(ScheduleLayerEntrySchema).describe('Computed on-call entries for the current time range.'),
    rendered_coverage_percentage: z
        .number()
        .nullable()
        .optional()
        .describe('Percentage of the time range covered by this schedule. Null or omitted unless since or until are set.')
});

const RestrictionOutputSchema = z.object({
    type: z.enum(['daily_restriction', 'weekly_restriction']).describe('Type of restriction.'),
    duration_seconds: z.number().describe('Duration of the restriction in seconds.'),
    start_time_of_day: z.string().describe('Start time in HH:mm:ss format.'),
    start_day_of_week: z.number().optional().describe('ISO 8601 day of week (1 is Monday). Only present for weekly restrictions.')
});

const ScheduleLayerOutputSchema = z.object({
    id: z.string().nullable().optional().describe('Layer ID.'),
    name: z.string().describe('Name of the schedule layer.'),
    start: z.string().describe('Start time of this layer in ISO 8601 format.'),
    rotation_virtual_start: z.string().describe('Effective start time of the layer in ISO 8601 format.'),
    rotation_turn_length_seconds: z.number().describe('Duration of each on-call shift in seconds.'),
    users: z
        .array(
            z
                .object({
                    user: UserReferenceSchema.nullable().describe('User on this layer.')
                })
                .describe('User wrapper object.')
        )
        .describe('Ordered list of users on this layer.'),
    restrictions: z.array(RestrictionOutputSchema).optional().describe('Restrictions for this layer.'),
    rendered_schedule_entries: z.array(ScheduleLayerEntrySchema).describe('Computed entries for this layer in the preview window.'),
    rendered_coverage_percentage: z
        .number()
        .nullable()
        .optional()
        .describe('Percentage of the time range covered by this layer. Null or omitted unless since or until are set.')
});

const ScheduleOutputSchema = z.object({
    id: z.string().nullable().optional().describe('Schedule ID (generated for preview).'),
    type: z.string().describe('Type of object. Example: "schedule".'),
    summary: z.string().nullable().optional().describe('Summary of the schedule.'),
    self: z.string().nullable().optional().describe('API URL of the schedule.'),
    html_url: z.string().nullable().optional().describe('Web app URL of the schedule.'),
    name: z.string().describe('Name of the schedule.'),
    time_zone: z.string().describe('Time zone of the schedule.'),
    description: z.string().nullable().optional().describe('Description of the schedule.'),
    schedule_layers: z.array(ScheduleLayerOutputSchema).describe('Schedule layers with computed preview entries and coverage.'),
    final_schedule: SubScheduleSchema.describe('Final computed schedule combining all layers and overrides.'),
    overrides_subschedule: SubScheduleSchema.describe('Overrides subschedule with computed entries.')
});

const OutputSchema = z
    .object({
        schedule: ScheduleOutputSchema.describe('Previewed schedule with computed on-call entries and coverage percentages.')
    })
    .describe('Output of the schedule preview with computed on-call entries.');

/**
 * @tags: [read]
 * @tagReason: Computes a schedule preview without persisting any data on the provider.
 * @pitfalls: rendered_schedule_entries and rendered_coverage_percentage are only populated when since or until is provided; layer start times in the response may be adjusted and differ from the input; set overflow=true to include entries that cross the date range boundaries.
 */
const action = createAction({
    description: 'Preview the computed on-call entries for a schedule definition without saving it.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['schedules.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://raw.githubusercontent.com/PagerDuty/api-schema/main/reference/REST/openapiv3.json#/paths/~1schedules~1preview/post
            endpoint: '/schedules/preview',
            data: {
                // PagerDuty's Schedule schema requires `type`; the input schema allows callers to omit it, so it must
                // always be populated on the outgoing request regardless of what the caller supplied.
                schedule: {
                    ...input.schedule,
                    type: 'schedule'
                }
            },
            params: {
                ...(input.since !== undefined && { since: input.since }),
                ...(input.until !== undefined && { until: input.until }),
                ...(input.overflow !== undefined && { overflow: String(input.overflow) })
            },
            retries: 3
        });

        const raw = z.object({ schedule: z.unknown() }).parse(response.data);
        const schedule = ScheduleOutputSchema.parse(raw.schedule);

        return {
            schedule
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
