import { z } from 'zod';
import { createAction } from 'nango';

const CostInputSchema = z.object({
    currency: z.string().describe('ISO 4217 currency code (e.g. "USD").'),
    amount: z.string().describe('Monetary amount as a decimal string (e.g. "100.00").')
});

const InputSchema = z.object({
    employeeId: z.string().describe('Employee ID. Example: "4"'),
    completed: z.string().describe('Completion date in yyyy-mm-dd format. Example: "2026-05-29"'),
    type: z.number().describe('Training type ID. Example: 14'),
    instructor: z.string().optional().describe('Name of the training instructor.'),
    hours: z.number().optional().describe('Number of hours for the training.'),
    credits: z.number().optional().describe('Credits earned for the training.'),
    notes: z.string().optional().describe('Optional notes about the training record.'),
    cost: CostInputSchema.optional().describe('Optional cost for the training record.')
});

const ProviderTrainingRecordSchema = z.object({
    id: z.union([z.string(), z.number()]),
    employeeId: z.string(),
    completed: z.string(),
    notes: z.union([z.string(), z.null()]).optional(),
    instructor: z.union([z.string(), z.null()]).optional(),
    credits: z.union([z.string(), z.null()]).optional(),
    hours: z.union([z.string(), z.null()]).optional(),
    cost: z.union([z.string(), z.null()]).optional(),
    type: z.union([z.string(), z.number()])
});

const OutputSchema = z.object({
    id: z.string(),
    employeeId: z.string(),
    completed: z.string(),
    notes: z.string().optional(),
    instructor: z.string().optional(),
    credits: z.string().optional(),
    hours: z.string().optional(),
    cost: z.string().optional(),
    type: z.union([z.string(), z.number()]).optional()
});

const action = createAction({
    description: 'Create a training record for an employee in BambooHR.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['training.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://documentation.bamboohr.com/reference/create-employee-training-record
            endpoint: `/v1/training/record/employee/${encodeURIComponent(input.employeeId)}`,
            data: {
                completed: input.completed,
                type: input.type,
                ...(input.instructor !== undefined && { instructor: input.instructor }),
                ...(input.hours !== undefined && { hours: input.hours }),
                ...(input.credits !== undefined && { credits: input.credits }),
                ...(input.notes !== undefined && { notes: input.notes }),
                ...(input.cost !== undefined && { cost: input.cost })
            },
            retries: 10
        });

        const providerRecord = ProviderTrainingRecordSchema.parse(response.data);

        return {
            id: String(providerRecord.id),
            employeeId: providerRecord.employeeId,
            completed: providerRecord.completed,
            ...(providerRecord.notes != null && providerRecord.notes !== '' && { notes: providerRecord.notes }),
            ...(providerRecord.instructor != null && providerRecord.instructor !== '' && { instructor: providerRecord.instructor }),
            ...(providerRecord.credits != null && providerRecord.credits !== '' && { credits: providerRecord.credits }),
            ...(providerRecord.hours != null && providerRecord.hours !== '' && { hours: providerRecord.hours }),
            ...(providerRecord.cost != null && providerRecord.cost !== '' && { cost: providerRecord.cost }),
            type: providerRecord.type
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
