import { z } from 'zod';
import { createAction } from 'nango';

const IntervalSchema = z.object({
    days: z.number().describe('Rotation interval in days. Example: 7')
});

const MemberSchema = z.object({
    user_id: z.string().describe('User ID of the rotation member. Example: "123"')
});

const LayerSchema = z.object({
    name: z.string().describe('Name of the rotation layer. Example: "Primary"'),
    effective_date: z.string().describe('ISO 8601 date when the layer becomes effective. Example: "2026-08-03T00:00:00+00:00"'),
    rotation_start: z.string().describe('ISO 8601 date when the rotation starts. Example: "2026-08-03T00:00:00+00:00"'),
    interval: IntervalSchema,
    members: z.array(MemberSchema).describe('List of rotation members'),
    restrictions: z.array(z.unknown()).optional().describe('Restrictions for this layer')
});

const InputSchema = z.object({
    name: z.string().describe('Name of the On-Call schedule. Example: "Nango Registry Test Schedule 2"'),
    time_zone: z.string().optional().describe('Time zone for the schedule. Example: "UTC"'),
    layers: z.array(LayerSchema).describe('Rotation layers for the schedule')
});

const ScheduleAttributesSchema = z.object({
    name: z.string(),
    time_zone: z.string().optional(),
    layers: z.array(z.object({}).passthrough()).optional()
});

const ScheduleDataSchema = z.object({
    type: z.string(),
    id: z.string(),
    attributes: ScheduleAttributesSchema
});

const ProviderResponseSchema = z.object({
    data: ScheduleDataSchema
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    time_zone: z.string().optional(),
    layers: z.array(z.object({}).passthrough()).optional()
});

const action = createAction({
    description: 'Create a new On-Call rotation schedule',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://docs.datadoghq.com/api/latest/on-call/#create-on-call-schedule
            endpoint: 'v2/on-call/schedules',
            data: {
                data: {
                    type: 'schedules',
                    attributes: {
                        name: input.name,
                        time_zone: input.time_zone,
                        layers: input.layers
                    }
                }
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            id: providerResponse.data.id,
            name: providerResponse.data.attributes.name,
            ...(providerResponse.data.attributes.time_zone != null && {
                time_zone: providerResponse.data.attributes.time_zone
            }),
            ...(providerResponse.data.attributes.layers != null && {
                layers: providerResponse.data.attributes.layers
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
