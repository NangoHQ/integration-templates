import { createSync } from 'nango';
import { z } from 'zod';

const LeaveRecordSchema = z.object({
    id: z.string(),
    from: z.string().optional(),
    to: z.string().optional(),
    leaveTypeId: z.string().optional(),
    leaveTypeName: z.string().optional(),
    employeeId: z.string().optional(),
    employeeName: z.string().optional(),
    status: z.string().optional(),
    days: z.number().optional(),
    dateOfRequest: z.string().optional(),
    unit: z.string().optional(),
    type: z.string().optional()
});

const CheckpointSchema = z.object({
    to: z.string(),
    startIndex: z.number()
});

const ApiResponseSchema = z.object({
    records: z.record(z.string(), z.unknown())
});

const RawRecordSchema = z.record(z.string(), z.unknown());

function formatDate(date: Date): string {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = String(date.getDate()).padStart(2, '0');
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
}

function getOneYearAgo(): string {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 1);
    return formatDate(date);
}

function toStringOrUndefined(value: unknown): string | undefined {
    if (value === null || value === undefined) {
        return undefined;
    }
    return String(value);
}

const sync = createSync({
    description: 'Sync leave records.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        LeaveRecord: LeaveRecordSchema
    },
    endpoints: [{ method: 'GET', path: '/syncs/leave-records' }],

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const today = new Date();
        const toDate = formatDate(today);
        const fromDate = getOneYearAgo();

        let startIndex = 1;
        if (checkpoint && checkpoint['to'] === toDate && checkpoint['startIndex'] !== undefined) {
            startIndex = checkpoint['startIndex'];
        }

        const limit = 100;

        while (true) {
            // https://www.zoho.com/people/api/overview.html
            const response = await nango.get({
                endpoint: '/api/v2/leavetracker/leaves/records',
                params: {
                    from: fromDate,
                    to: toDate,
                    startIndex: String(startIndex),
                    limit: String(limit)
                },
                retries: 3
            });

            const parsed = ApiResponseSchema.safeParse(response.data);
            if (!parsed.success) {
                throw new Error(`Invalid response structure: ${parsed.error.message}`);
            }

            const recordsObj = parsed.data.records;
            const recordIds = Object.keys(recordsObj);

            if (recordIds.length === 0) {
                break;
            }

            const records = recordIds.map((id) => {
                const raw = recordsObj[id];
                const parsedRecord = RawRecordSchema.safeParse(raw);
                if (!parsedRecord.success) {
                    throw new Error(`Invalid record structure for id ${id}: ${parsedRecord.error.message}`);
                }
                const record = parsedRecord.data;

                const mapped: z.infer<typeof LeaveRecordSchema> = {
                    id
                };

                const from = toStringOrUndefined(record['From']);
                if (from !== undefined) {
                    mapped.from = from;
                }

                const to = toStringOrUndefined(record['To']);
                if (to !== undefined) {
                    mapped.to = to;
                }

                const leaveTypeId = toStringOrUndefined(record['Leavetype.ID']);
                if (leaveTypeId !== undefined) {
                    mapped.leaveTypeId = leaveTypeId;
                }

                const leaveTypeName = toStringOrUndefined(record['Leavetype']);
                if (leaveTypeName !== undefined) {
                    mapped.leaveTypeName = leaveTypeName;
                }

                const employeeId = toStringOrUndefined(record['EmployeeId']);
                if (employeeId !== undefined) {
                    mapped.employeeId = employeeId;
                }

                const employeeName = toStringOrUndefined(record['Employee']);
                if (employeeName !== undefined) {
                    mapped.employeeName = employeeName;
                }

                const status = toStringOrUndefined(record['ApprovalStatus']);
                if (status !== undefined) {
                    mapped.status = status;
                }

                const daysValue = record['Days'];
                if (daysValue !== null && daysValue !== undefined && typeof daysValue === 'object') {
                    const daysParsed = z.record(z.string(), z.unknown()).safeParse(daysValue);
                    if (daysParsed.success) {
                        mapped.days = Object.keys(daysParsed.data).length;
                    }
                }

                const dateOfRequest = toStringOrUndefined(record['DateOfRequest']);
                if (dateOfRequest !== undefined) {
                    mapped.dateOfRequest = dateOfRequest;
                }

                const unit = toStringOrUndefined(record['Unit']);
                if (unit !== undefined) {
                    mapped.unit = unit;
                }

                const type = toStringOrUndefined(record['Type']);
                if (type !== undefined) {
                    mapped.type = type;
                }

                return mapped;
            });

            if (records.length > 0) {
                await nango.batchSave(records, 'LeaveRecord');
            }

            await nango.saveCheckpoint({
                to: toDate,
                startIndex: startIndex + records.length
            });

            if (recordIds.length < limit) {
                break;
            }

            startIndex += records.length;
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
