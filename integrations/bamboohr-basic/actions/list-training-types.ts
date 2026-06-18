import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const TrainingCategorySchema = z.object({
    id: z.string(),
    name: z.string()
});

const DueFromHireDateSchema = z.object({
    unit: z.string(),
    amount: z.string()
});

const TrainingTypeSchema = z.object({
    id: z.string(),
    name: z.string(),
    renewable: z.boolean(),
    frequency: z.union([z.string(), z.number()]).optional().nullable(),
    dueFromHireDate: z.union([z.array(z.unknown()), DueFromHireDateSchema]).optional(),
    required: z.boolean(),
    category: z.union([z.array(z.unknown()), TrainingCategorySchema]).optional(),
    linkUrl: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    allowEmployeesToMarkComplete: z.boolean()
});

const OutputSchema = z.record(z.string(), TrainingTypeSchema);

const action = createAction({
    description: 'List training types configured in BambooHR.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://documentation.bamboohr.com/reference/list-training-types
            endpoint: 'v1/training/type',
            retries: 3
        });

        const parsed = OutputSchema.parse(response.data);
        return parsed;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
