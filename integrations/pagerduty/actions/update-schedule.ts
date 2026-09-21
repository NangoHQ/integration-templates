import { z } from 'zod';
import { createAction } from 'nango';

const RestrictionSchema = z
    .object({
        type: z.enum(['daily_restriction', 'weekly_restriction']).describe('Restriction type'),
        duration_seconds: z.number().describe('Duration of the restriction in seconds'),
        start_time_of_day: z.string().describe('Start time in HH:mm:ss format'),
        start_day_of_week: z.number().optional().describe('ISO day of week (1-7), required for weekly restrictions')
    })
    .describe('A restriction limiting when the layer can assign on-call shifts');

const ScheduleLayerUserSchema = z
    .object({
        user: z
            .object({
                id: z.string().describe('User ID'),
                type: z.string().describe('User reference type, e.g. user_reference')
            })
            .describe('User reference wrapper')
    })
    .describe('An ordered user entry in a schedule layer');

const ScheduleLayerSchema = z
    .object({
        id: z.string().optional().describe('Existing layer ID. Omit to create a new layer.'),
        name: z.string().describe('Layer name'),
        start: z.string().describe('Layer start time in ISO 8601 format'),
        end: z.string().nullable().optional().describe('Layer end time. Pass null to leave open-ended.'),
        rotation_virtual_start: z.string().describe('Effective start time of the rotation'),
        rotation_turn_length_seconds: z.number().describe('Duration of each shift in seconds'),
        users: z.array(ScheduleLayerUserSchema).describe('Ordered list of users in this layer'),
        restrictions: z.array(RestrictionSchema).optional().describe('Restrictions for this layer')
    })
    .describe('A schedule layer defining on-call rotation rules');

const InputSchema = z
    .object({
        id: z.string().describe('Schedule ID to update'),
        name: z.string().optional().describe('New schedule name'),
        time_zone: z.string().optional().describe('New time zone, e.g. America/New_York'),
        description: z.string().nullable().optional().describe('New description. Pass null to clear the description.'),
        schedule_layers: z.array(ScheduleLayerSchema).optional().describe('Complete replacement schedule layers. Omit to keep existing layers unchanged.')
    })
    .describe('Input to update an existing PagerDuty schedule');

const ProviderRestrictionSchema = z.object({
    type: z.enum(['daily_restriction', 'weekly_restriction']),
    duration_seconds: z.number(),
    start_time_of_day: z.string(),
    start_day_of_week: z.number().optional()
});

const ProviderScheduleLayerUserSchema = z.object({
    user: z.object({
        id: z.string(),
        type: z.string()
    })
});

const ProviderScheduleLayerSchema = z.object({
    id: z.string().optional(),
    name: z.string(),
    start: z.string(),
    end: z.string().nullable().optional(),
    rotation_virtual_start: z.string(),
    rotation_turn_length_seconds: z.number(),
    users: z.array(ProviderScheduleLayerUserSchema),
    restrictions: z.array(ProviderRestrictionSchema).optional()
});

const ProviderScheduleSchema = z.object({
    id: z.string(),
    type: z.string(),
    name: z.string(),
    time_zone: z.string(),
    description: z.string().nullable().optional(),
    schedule_layers: z.array(ProviderScheduleLayerSchema)
});

const ProviderScheduleEnvelopeSchema = z.object({
    schedule: ProviderScheduleSchema
});

const OutputScheduleLayerUserSchema = z
    .object({
        user: z
            .object({
                id: z.string().describe('User ID'),
                type: z.string().describe('User reference type')
            })
            .describe('User reference wrapper')
    })
    .describe('An ordered user entry in a schedule layer');

const OutputScheduleLayerSchema = z
    .object({
        id: z.string().optional().describe('Layer ID'),
        name: z.string().describe('Layer name'),
        start: z.string().describe('Layer start time'),
        end: z.string().optional().describe('Layer end time if set'),
        rotation_virtual_start: z.string().describe('Effective start time of the rotation'),
        rotation_turn_length_seconds: z.number().describe('Duration of each shift in seconds'),
        users: z.array(OutputScheduleLayerUserSchema).describe('Ordered list of users in this layer'),
        restrictions: z.array(RestrictionSchema).optional().describe('Restrictions for this layer')
    })
    .describe('A schedule layer defining on-call rotation rules');

const OutputSchema = z
    .object({
        id: z.string().describe('Schedule ID'),
        type: z.string().describe('Object type'),
        name: z.string().describe('Schedule name'),
        time_zone: z.string().describe('Time zone'),
        description: z.string().optional().describe('Schedule description'),
        schedule_layers: z.array(OutputScheduleLayerSchema).describe('Schedule layers')
    })
    .describe('Updated PagerDuty schedule');

/**
 * @tags: [read, write, destructive]
 * @tagReason: Reads the existing schedule before performing a full-replacement PUT that overwrites the schedule on the provider. Passing a partial schedule_layers array will permanently replace all existing layers.
 * @pitfalls: Passing schedule_layers fully replaces all existing layers. PagerDuty rewrites layer start times to the current server timestamp on every update, ignoring supplied start values.
 */
const action = createAction({
    description: "Update a schedule's name, time zone, or layers.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['schedules.read', 'schedules.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.pagerduty.com/api-reference/f245f13fbd6e2-get-a-schedule
        const getResponse = await nango.get({
            endpoint: `/schedules/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (!getResponse.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Schedule ${input.id} not found`
            });
        }

        const getEnvelope = ProviderScheduleEnvelopeSchema.parse(getResponse.data);
        const existing = getEnvelope.schedule;

        const preservedLayers = existing.schedule_layers.map((layer) => ({
            ...(layer.id !== undefined && { id: layer.id }),
            name: layer.name,
            start: layer.start,
            ...(layer.end !== undefined && { end: layer.end }),
            rotation_virtual_start: layer.rotation_virtual_start,
            rotation_turn_length_seconds: layer.rotation_turn_length_seconds,
            users: layer.users.map((u) => ({ user: { id: u.user.id, type: u.user.type } })),
            ...(layer.restrictions !== undefined && { restrictions: layer.restrictions })
        }));

        const layers = input.schedule_layers !== undefined ? input.schedule_layers : preservedLayers;

        const updateBody = {
            schedule: {
                type: 'schedule',
                name: input.name !== undefined ? input.name : existing.name,
                time_zone: input.time_zone !== undefined ? input.time_zone : existing.time_zone,
                ...(input.description !== undefined && { description: input.description }),
                schedule_layers: layers
            }
        };

        // https://developer.pagerduty.com/api-reference/fa9e0fa2efd81-update-a-schedule
        const putResponse = await nango.put({
            endpoint: `/schedules/${encodeURIComponent(input.id)}`,
            data: updateBody,
            retries: 3
        });

        const putEnvelope = ProviderScheduleEnvelopeSchema.parse(putResponse.data);
        const updated = putEnvelope.schedule;

        return {
            id: updated.id,
            type: updated.type,
            name: updated.name,
            time_zone: updated.time_zone,
            ...(updated.description != null && { description: updated.description }),
            schedule_layers: updated.schedule_layers.map((layer) => ({
                ...(layer.id !== undefined && { id: layer.id }),
                name: layer.name,
                start: layer.start,
                ...(layer.end != null && { end: layer.end }),
                rotation_virtual_start: layer.rotation_virtual_start,
                rotation_turn_length_seconds: layer.rotation_turn_length_seconds,
                users: layer.users,
                ...(layer.restrictions !== undefined && { restrictions: layer.restrictions })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
