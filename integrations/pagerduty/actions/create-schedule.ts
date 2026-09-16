import { z } from 'zod';
import { createAction } from 'nango';

const ScheduleLayerUserInputSchema = z
    .object({
        user: z
            .object({
                id: z.string().describe('The PagerDuty user ID to assign to this layer.'),
                type: z.string().describe('The user reference type. Example: "user_reference".')
            })
            .describe('A user assignment wrapper within a schedule layer.')
    })
    .describe('A user entry for a schedule layer input.');

const ScheduleLayerInputSchema = z
    .object({
        name: z.string().describe('The name of the schedule layer.'),
        start: z.string().describe('The start time of the layer in ISO 8601 format.'),
        rotation_virtual_start: z.string().describe('The effective start time of the rotation in ISO 8601 format.'),
        rotation_turn_length_seconds: z.number().describe('The duration of each rotation turn in seconds.'),
        users: z.array(ScheduleLayerUserInputSchema).describe('The users assigned to this schedule layer.')
    })
    .describe('A schedule layer defining the on-call rotation in the input.');

const InputSchema = z
    .object({
        name: z.string().describe('The name of the on-call schedule.'),
        time_zone: z.string().describe('The time zone for the schedule. Example: "UTC".'),
        schedule_layers: z.array(ScheduleLayerInputSchema).describe('One or more schedule layers defining the rotation.')
    })
    .describe('Input for creating a PagerDuty on-call schedule.');

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
    rotation_virtual_start: z.string(),
    rotation_turn_length_seconds: z.number(),
    users: z.array(ProviderScheduleLayerUserSchema)
});

const ProviderScheduleSchema = z.object({
    id: z.string(),
    name: z.string(),
    time_zone: z.string(),
    schedule_layers: z.array(ProviderScheduleLayerSchema)
});

const ScheduleLayerUserOutputSchema = z
    .object({
        user: z
            .object({
                id: z.string().describe('The PagerDuty user ID assigned to this layer.'),
                type: z.string().describe('The user reference type.')
            })
            .describe('A user assignment wrapper.')
    })
    .describe('A user entry for a schedule layer output.');

const ScheduleLayerOutputSchema = z
    .object({
        id: z.string().optional().describe('The unique ID of the schedule layer, if assigned by the provider.'),
        name: z.string().describe('The name of the schedule layer.'),
        start: z.string().describe('The start time of the layer.'),
        rotation_virtual_start: z.string().describe('The rotation virtual start time.'),
        rotation_turn_length_seconds: z.number().describe('The rotation turn length in seconds.'),
        users: z.array(ScheduleLayerUserOutputSchema).describe('The users assigned to this layer.')
    })
    .describe('A schedule layer returned after creating a PagerDuty on-call schedule.');

const OutputSchema = z
    .object({
        id: z.string().describe('The unique ID of the created schedule.'),
        name: z.string().describe('The name of the created schedule.'),
        time_zone: z.string().describe('The time zone of the created schedule.'),
        schedule_layers: z.array(ScheduleLayerOutputSchema).describe('The schedule layers of the created schedule.')
    })
    .describe('Output of a newly created PagerDuty on-call schedule.');

/**
 * @tags: [write]
 * @tagReason: Creates a new on-call schedule in PagerDuty.
 * @pitfalls: Schedule names must be unique across the account; the provider normalizes time_zone values (e.g., UTC to Etc/UTC) and may adjust past layer start times to the current creation time.
 */
const action = createAction({
    description: 'Create an on-call schedule with one or more layers.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['schedules.write'],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.pagerduty.com/api-reference/reference/REST/openapiv3.json/paths/~1schedules/post
            endpoint: '/schedules',
            data: {
                schedule: {
                    type: 'schedule',
                    name: input.name,
                    time_zone: input.time_zone,
                    schedule_layers: input.schedule_layers
                }
            },
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object' || !('schedule' in response.data)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from PagerDuty: missing schedule object.'
            });
        }

        const providerSchedule = ProviderScheduleSchema.parse(response.data.schedule);

        return {
            id: providerSchedule.id,
            name: providerSchedule.name,
            time_zone: providerSchedule.time_zone,
            schedule_layers: providerSchedule.schedule_layers.map((layer) => ({
                id: layer.id,
                name: layer.name,
                start: layer.start,
                rotation_virtual_start: layer.rotation_virtual_start,
                rotation_turn_length_seconds: layer.rotation_turn_length_seconds,
                users: layer.users.map((u) => ({
                    user: {
                        id: u.user.id,
                        type: u.user.type
                    }
                }))
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
