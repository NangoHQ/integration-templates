import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    correction_id: z.string().trim().min(1).describe('The ID of the SLO correction object. Example: "abc123"')
});

const CreatorAttributesSchema = z.object({
    uuid: z.string().optional(),
    handle: z.string().optional(),
    email: z.string().optional(),
    name: z.string().optional(),
    icon: z.string().optional()
});

const CreatorDataSchema = z.object({
    type: z.string().optional(),
    id: z.string().optional(),
    attributes: CreatorAttributesSchema.optional()
});

const CreatorSchema = z
    .object({
        data: CreatorDataSchema.optional()
    })
    .nullable()
    .optional();

const AttributesSchema = z.object({
    category: z.enum(['Scheduled Maintenance', 'Outside Business Hours', 'Deployment', 'Other']).optional(),
    created_at: z.number().optional(),
    creator: CreatorSchema,
    description: z.string().optional(),
    duration: z.number().nullable().optional(),
    end: z.number().optional(),
    modified_at: z.number().optional(),
    modifier: CreatorSchema,
    rrule: z.string().nullable().optional(),
    slo_id: z.string().optional(),
    slo_query: z.string().nullable().optional(),
    start: z.number().optional(),
    timezone: z.string().optional()
});

const DataSchema = z.object({
    attributes: AttributesSchema.optional(),
    id: z.string().optional(),
    type: z.string().optional()
});

const OutputSchema = z.object({
    data: DataSchema.optional()
});

const action = createAction({
    description: 'Get a single SLO correction by id.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['slos_read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.datadoghq.com/api/latest/service-level-objective-corrections/get-an-slo-correction-for-an-slo/
            endpoint: `v1/slo/correction/${encodeURIComponent(input.correction_id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'SLO correction not found',
                correction_id: input.correction_id
            });
        }

        const parsed = OutputSchema.parse(response.data);
        return parsed;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
