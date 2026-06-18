import { z } from 'zod';
import { createAction } from 'nango';

const CostInputSchema = z
    .object({
        currency: z.string().optional().describe('ISO 4217 currency code. Example: "USD"'),
        amount: z.string().optional().describe('Monetary amount as a decimal string. Example: "100.00"')
    })
    .optional();

const InputSchema = z.object({
    trainingRecordId: z.union([z.string(), z.number()]).describe('The ID of the training record to update. Example: "123"'),
    completed: z.string().describe('Completion date in yyyy-mm-dd format. Example: "2024-01-15"'),
    cost: CostInputSchema,
    instructor: z.string().optional().describe('Name of the training instructor'),
    hours: z.union([z.string(), z.number()]).optional().describe('Number of hours for the training'),
    credits: z.union([z.string(), z.number()]).optional().describe('Credits earned for the training'),
    notes: z.string().optional().describe('Optional notes about the training record')
});

const ProviderTrainingRecordSchema = z.object({
    id: z.union([z.string(), z.number()]),
    employeeId: z.union([z.string(), z.number()]).optional().nullable(),
    employee_id: z.union([z.string(), z.number()]).optional().nullable(),
    completed: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    instructor: z.string().optional().nullable(),
    credits: z.union([z.string(), z.number()]).optional().nullable(),
    hours: z.union([z.string(), z.number()]).optional().nullable(),
    cost: z.string().optional().nullable(),
    type: z
        .union([z.string(), z.number(), z.object({}).passthrough()])
        .optional()
        .nullable()
});

const OutputSchema = z.object({
    trainingRecordId: z.string(),
    employeeId: z.string().optional(),
    completed: z.string().optional(),
    notes: z.string().optional(),
    instructor: z.string().optional(),
    credits: z.string().optional(),
    hours: z.string().optional(),
    cost: z.string().optional(),
    trainingTypeId: z.string().optional()
});

const action = createAction({
    description: 'Update a training record for an employee in BambooHR.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const trainingRecordId = String(input.trainingRecordId);
        const payload: {
            completed: string;
            cost?: { currency?: string | undefined; amount?: string | undefined };
            instructor?: string;
            hours?: string | number;
            credits?: string | number;
            notes?: string;
        } = {
            completed: input.completed
        };

        if (input.cost !== undefined) {
            payload.cost = input.cost;
        }
        if (input.instructor !== undefined) {
            payload.instructor = input.instructor;
        }
        if (input.hours !== undefined) {
            payload.hours = input.hours;
        }
        if (input.credits !== undefined) {
            payload.credits = input.credits;
        }
        if (input.notes !== undefined) {
            payload.notes = input.notes;
        }

        const response = await nango.put({
            // https://documentation.bamboohr.com/reference/update-employee-training-record
            endpoint: `/v1/training/record/${encodeURIComponent(trainingRecordId)}`,
            data: payload,
            retries: 3
        });

        const providerRecord = ProviderTrainingRecordSchema.parse(response.data);

        const employeeId = providerRecord.employeeId ?? providerRecord.employee_id;
        const typeValue = providerRecord.type;
        let trainingTypeId: string | undefined;
        if (typeValue != null) {
            if (typeof typeValue === 'string' || typeof typeValue === 'number') {
                trainingTypeId = String(typeValue);
            } else if (typeof typeValue === 'object' && typeValue !== null && 'id' in typeValue) {
                trainingTypeId = String(typeValue['id']);
            }
        }

        return {
            trainingRecordId: String(providerRecord.id),
            ...(employeeId != null && { employeeId: String(employeeId) }),
            ...(providerRecord.completed != null && { completed: providerRecord.completed }),
            ...(providerRecord.notes != null && { notes: providerRecord.notes }),
            ...(providerRecord.instructor != null && { instructor: providerRecord.instructor }),
            ...(providerRecord.credits != null && { credits: String(providerRecord.credits) }),
            ...(providerRecord.hours != null && { hours: String(providerRecord.hours) }),
            ...(providerRecord.cost != null && { cost: providerRecord.cost }),
            ...(trainingTypeId != null && { trainingTypeId })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
