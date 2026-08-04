import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    schedule_id: z.string().trim().min(1).describe('The ID of the On-Call schedule. Example: "3653d3c6-0c75-11ea-ad28-fb5701eabc7d"')
});

const ScheduleRelationshipDataSchema = z.object({
    id: z.string(),
    type: z.string()
});

const ScheduleRelationshipSchema = z
    .object({
        data: z.union([z.array(ScheduleRelationshipDataSchema), ScheduleRelationshipDataSchema]).optional()
    })
    .passthrough();

const ScheduleDataSchema = z.object({
    id: z.string(),
    type: z.string(),
    attributes: z.object({}).passthrough(),
    relationships: z.record(z.string(), ScheduleRelationshipSchema).optional()
});

const OutputSchema = z.object({
    data: ScheduleDataSchema,
    included: z.array(z.object({}).passthrough()).optional()
});

const action = createAction({
    description: 'Get a single On-Call schedule by id.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.datadoghq.com/api/latest/on-call/#get-on-call-schedule
            endpoint: `v2/on-call/schedules/${encodeURIComponent(input.schedule_id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'On-Call schedule not found',
                schedule_id: input.schedule_id
            });
        }

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
