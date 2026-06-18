import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    employee_id: z.number().int().describe('The ID of the employee to get a list of trainings for. Example: 123'),
    training_type_id: z.number().int().optional().describe('Optional training type ID to filter records.')
});

const ProviderTrainingRecordSchema = z.object({
    id: z.union([z.string(), z.number().int()]),
    employeeId: z.union([z.string(), z.number().int()]).nullish(),
    completed: z.string().nullish(),
    notes: z.string().nullish(),
    instructor: z.string().nullish(),
    credits: z.union([z.string(), z.number()]).nullish(),
    hours: z.union([z.string(), z.number()]).nullish(),
    cost: z.union([z.string(), z.number()]).nullish(),
    type: z.union([z.string(), z.number().int()]).nullish()
});

const TrainingRecordSchema = z.object({
    id: z.string(),
    employeeId: z.string().optional(),
    completed: z.string().optional(),
    notes: z.string().optional(),
    instructor: z.string().optional(),
    credits: z.string().optional(),
    hours: z.string().optional(),
    cost: z.string().optional(),
    type: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(TrainingRecordSchema),
    next_cursor: z.string().optional()
});

function normalizeTrainingRecord(record: z.infer<typeof ProviderTrainingRecordSchema>): z.infer<typeof TrainingRecordSchema> {
    return {
        id: String(record.id),
        ...(record.employeeId != null && { employeeId: String(record.employeeId) }),
        ...(record.completed != null && { completed: record.completed }),
        ...(record.notes != null && { notes: record.notes }),
        ...(record.instructor != null && { instructor: record.instructor }),
        ...(record.credits != null && { credits: String(record.credits) }),
        ...(record.hours != null && { hours: String(record.hours) }),
        ...(record.cost != null && { cost: String(record.cost) }),
        ...(record.type != null && { type: String(record.type) })
    };
}

const action = createAction({
    description: 'List training records for an employee in BambooHR.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://documentation.bamboohr.com/reference/list-employee-trainings
            endpoint: `/v1/training/record/employee/${encodeURIComponent(String(input.employee_id))}`,
            params: {
                ...(input.training_type_id !== undefined && { type: String(input.training_type_id) })
            },
            retries: 3
        };

        const response = await nango.get(config);

        const rawData: unknown = response.data;

        if (Array.isArray(rawData)) {
            return {
                items: []
            };
        }

        if (rawData === null || typeof rawData !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from training records endpoint.'
            });
        }

        const records = Object.values(rawData).map((item) => {
            const parsed = ProviderTrainingRecordSchema.safeParse(item);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Training record did not match expected schema.'
                });
            }
            return normalizeTrainingRecord(parsed.data);
        });

        return {
            items: records
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
