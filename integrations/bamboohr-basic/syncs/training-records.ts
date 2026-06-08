import { createSync } from 'nango';
import { z } from 'zod';

const TrainingRecordSchema = z.object({
    id: z.string(),
    employeeId: z.string(),
    completed: z.string().optional(),
    trainingTypeId: z.string().optional(),
    notes: z.string().optional(),
    instructor: z.string().optional(),
    credits: z.string().optional(),
    hours: z.string().optional(),
    cost: z.string().optional(),
    attachments: z.array(z.unknown()).optional()
});

const CheckpointSchema = z.object({
    last_employee_id: z.string(),
    max_completion_date: z.string()
});

const DirectoryEmployeeSchema = z.object({
    id: z.union([z.string(), z.number()])
});

const DirectoryResponseSchema = z.object({
    employees: z.array(DirectoryEmployeeSchema).optional()
});

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function getStringProperty(obj: unknown, key: string): string | undefined {
    if (!isRecord(obj)) {
        return undefined;
    }
    const val = obj[key];
    return typeof val === 'string' ? val : undefined;
}

function getArrayProperty(obj: unknown, key: string): unknown[] | undefined {
    if (!isRecord(obj)) {
        return undefined;
    }
    const val = obj[key];
    return Array.isArray(val) ? val : undefined;
}

const sync = createSync({
    description: 'Sync employee training records from BambooHR.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/training-records'
        }
    ],
    checkpoint: CheckpointSchema,
    models: {
        TrainingRecord: TrainingRecordSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();

        // https://documentation.bamboohr.com/reference/get-employees-directory
        const directoryResponse = await nango.get({
            endpoint: '/v1/employees/directory',
            retries: 3,
            headers: {
                Accept: 'application/json'
            }
        });

        const directoryParse = DirectoryResponseSchema.safeParse(directoryResponse.data);
        if (!directoryParse.success) {
            throw new Error('Unexpected employees directory response format');
        }

        const employees = directoryParse.data.employees ?? [];
        if (employees.length === 0) {
            return;
        }

        employees.sort((a, b) => {
            const idA = String(a.id);
            const idB = String(b.id);
            if (idA < idB) {
                return -1;
            }
            if (idA > idB) {
                return 1;
            }
            return 0;
        });

        await nango.trackDeletesStart('TrainingRecord');

        let startIndex = 0;
        const lastEmployeeId = checkpoint ? checkpoint['last_employee_id'] : '';
        if (lastEmployeeId) {
            const idx = employees.findIndex((emp) => String(emp.id) === lastEmployeeId);
            if (idx !== -1) {
                startIndex = idx + 1;
            }
        }

        let maxCompletionDate = checkpoint ? checkpoint['max_completion_date'] : '';
        let currentLastEmployeeId = lastEmployeeId;
        let finishedAll = false;

        for (let i = startIndex; i < employees.length; i++) {
            const employee = employees[i];
            if (employee === undefined) {
                continue;
            }

            const employeeId = String(employee.id);
            if (!employeeId) {
                continue;
            }

            // https://documentation.bamboohr.com/reference/list-employee-trainings
            const trainingResponse = await nango.get({
                endpoint: `/v1/training/record/employee/${encodeURIComponent(employeeId)}`,
                retries: 3
            });

            if (trainingResponse.data === null || trainingResponse.data === undefined) {
                continue;
            }

            const rawTraining = trainingResponse.data;
            if (Array.isArray(rawTraining) && rawTraining.length === 0) {
                continue;
            }

            if (!isRecord(rawTraining)) {
                continue;
            }

            const records: z.infer<typeof TrainingRecordSchema>[] = [];

            for (const [trainingRecordId, trainingRecord] of Object.entries(rawTraining)) {
                if (!isRecord(trainingRecord)) {
                    continue;
                }

                const completedDate = getStringProperty(trainingRecord, 'completed');

                if (completedDate) {
                    if (!maxCompletionDate || completedDate > maxCompletionDate) {
                        maxCompletionDate = completedDate;
                    }
                }

                records.push({
                    id: trainingRecordId,
                    employeeId,
                    completed: completedDate,
                    trainingTypeId: getStringProperty(trainingRecord, 'type'),
                    notes: getStringProperty(trainingRecord, 'notes'),
                    instructor: getStringProperty(trainingRecord, 'instructor'),
                    credits: getStringProperty(trainingRecord, 'credits'),
                    hours: getStringProperty(trainingRecord, 'hours'),
                    cost: getStringProperty(trainingRecord, 'cost'),
                    attachments: getArrayProperty(trainingRecord, 'attachments')
                });
            }

            if (records.length > 0) {
                await nango.batchSave(records, 'TrainingRecord');
            }

            currentLastEmployeeId = employeeId;
            await nango.saveCheckpoint({
                last_employee_id: currentLastEmployeeId,
                max_completion_date: maxCompletionDate
            });

            if (i === employees.length - 1) {
                finishedAll = true;
            }
        }

        if (finishedAll) {
            await nango.trackDeletesEnd('TrainingRecord');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
