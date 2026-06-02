import { createSync } from 'nango';
import { z } from 'zod';

const TimeTrackingEntrySchema = z.object({
    id: z.string(),
    employeeId: z.string(),
    type: z.string().optional(),
    date: z.string().optional(),
    start: z.string().optional(),
    end: z.string().optional(),
    timezone: z.string().optional(),
    hours: z.number().optional(),
    note: z.string().optional(),
    projectInfo: z.unknown().optional(),
    approvedAt: z.string().optional(),
    approved: z.boolean().optional()
});

const CheckpointSchema = z.object({
    lastEntryDate: z.string()
});

const RawEntrySchema = z.object({
    id: z.number().int(),
    employee_id: z.number().int().optional(),
    employeeId: z.union([z.number().int(), z.string()]).optional(),
    type: z.string().optional(),
    date: z.string().optional(),
    start: z.string().optional(),
    end: z.string().optional(),
    timezone: z.string().optional(),
    hours: z.number().optional(),
    note: z.string().nullish(),
    project_info: z.unknown().optional(),
    approved_at: z.string().optional(),
    approved: z.boolean().optional()
});

const sync = createSync({
    description: 'Sync time tracking entries from BambooHR',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    endpoints: [{ method: 'POST', path: '/syncs/time-tracking' }],
    models: {
        TimeTrackingEntry: TimeTrackingEntrySchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();

        const today = new Date().toISOString().slice(0, 10);
        const defaultStart = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        const startDate = checkpoint?.lastEntryDate ?? defaultStart;
        const endDate = today;

        // https://documentation.bamboohr.com/reference/list-employees
        const employeesResponse = await nango.get({
            endpoint: '/v1/employees',
            params: {
                fields: 'employeeId',
                'page[limit]': '2500'
            },
            retries: 3
        });

        const employees: { employeeId: string }[] = [];
        if (Array.isArray(employeesResponse.data)) {
            for (const raw of employeesResponse.data) {
                if (raw != null && typeof raw === 'object' && 'employeeId' in raw) {
                    const id = raw.employeeId;
                    if (typeof id === 'string') {
                        employees.push({ employeeId: id });
                    }
                }
            }
        } else if (employeesResponse.data != null && typeof employeesResponse.data === 'object' && Array.isArray(employeesResponse.data.data)) {
            for (const raw of employeesResponse.data.data) {
                if (raw != null && typeof raw === 'object' && 'employeeId' in raw) {
                    const id = raw.employeeId;
                    if (typeof id === 'string') {
                        employees.push({ employeeId: id });
                    }
                }
            }
        }

        let maxEntryDate: string | undefined;

        for (const employee of employees) {
            // https://documentation.bamboohr.com/reference/list-timesheet-entries
            const response = await nango.get({
                endpoint: '/v1/time_tracking/timesheet_entries',
                params: {
                    start: startDate,
                    end: endDate,
                    employeeIds: employee.employeeId
                },
                retries: 3
            });

            let rawData: unknown[] = [];
            if (Array.isArray(response.data)) {
                rawData = response.data;
            } else if (response.data != null && typeof response.data === 'object') {
                for (const [, value] of Object.entries(response.data)) {
                    if (Array.isArray(value)) {
                        for (const item of value) {
                            rawData.push(item);
                        }
                    }
                }
            }

            const entries: z.infer<typeof TimeTrackingEntrySchema>[] = [];

            for (const raw of rawData) {
                const parsed = RawEntrySchema.safeParse(raw);
                if (!parsed.success) {
                    throw new Error(`Failed to parse time tracking entry: ${parsed.error.message}`);
                }

                const entry = parsed.data;
                const resolvedEmployeeId = entry.employee_id ?? (entry.employeeId != null ? Number(entry.employeeId) : undefined);
                entries.push({
                    id: String(entry.id),
                    employeeId: resolvedEmployeeId != null ? String(resolvedEmployeeId) : employee.employeeId,
                    ...(entry.type != null && { type: entry.type }),
                    ...(entry.date != null && { date: entry.date }),
                    ...(entry.start != null && { start: entry.start }),
                    ...(entry.end != null && { end: entry.end }),
                    ...(entry.timezone != null && { timezone: entry.timezone }),
                    ...(entry.hours != null && { hours: entry.hours }),
                    ...(entry.note != null && { note: entry.note }),
                    ...(entry.project_info !== undefined && { projectInfo: entry.project_info }),
                    ...(entry.approved_at != null && { approvedAt: entry.approved_at }),
                    ...(entry.approved != null && { approved: entry.approved })
                });

                if (entry.date != null && (maxEntryDate == null || entry.date > maxEntryDate)) {
                    maxEntryDate = entry.date;
                }
            }

            if (entries.length > 0) {
                await nango.batchSave(entries, 'TimeTrackingEntry');
            }
        }

        await nango.saveCheckpoint({
            lastEntryDate: maxEntryDate ?? endDate
        });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
