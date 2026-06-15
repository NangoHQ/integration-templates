import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDate(date: Date): string {
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = MONTHS[date.getUTCMonth()];
    const year = date.getUTCFullYear();
    return `${day}-${month}-${year}`;
}

function parseDate(dateStr: string): Date {
    const parts = dateStr.split('-');
    if (parts.length !== 3) {
        throw new Error(`Invalid date format: ${dateStr}`);
    }
    const [dayStr, monthStr, yearStr] = parts;
    if (dayStr === undefined || monthStr === undefined || yearStr === undefined) {
        throw new Error(`Invalid date format: ${dateStr}`);
    }
    const day = parseInt(dayStr, 10);
    const month = MONTHS.indexOf(monthStr);
    const year = parseInt(yearStr, 10);
    if (month === -1 || Number.isNaN(day) || Number.isNaN(year)) {
        throw new Error(`Invalid date format: ${dateStr}`);
    }
    return new Date(Date.UTC(year, month, day));
}

function subtractDays(date: Date, days: number): string {
    const result = new Date(date);
    result.setUTCDate(result.getUTCDate() - days);
    return formatDate(result);
}

function addDays(date: Date, days: number): string {
    const result = new Date(date);
    result.setUTCDate(result.getUTCDate() + days);
    return formatDate(result);
}

const AttendanceSchema = z.object({
    id: z.string(),
    employeeId: z.string().optional(),
    employeeEmail: z.string().optional(),
    employeeFirstName: z.string().optional(),
    employeeLastName: z.string().optional(),
    date: z.string(),
    status: z.string().optional(),
    firstIn: z.string().optional(),
    lastOut: z.string().optional(),
    totalHours: z.string().optional(),
    workingHours: z.string().optional(),
    overTime: z.string().optional(),
    deviationTime: z.string().optional(),
    shiftName: z.string().optional(),
    shiftStartTime: z.string().optional(),
    shiftEndTime: z.string().optional(),
    paidBreakHours: z.string().optional(),
    unPaidBreakHours: z.string().optional(),
    firstInLocation: z.string().optional(),
    lastOutLocation: z.string().optional()
});

const CheckpointSchema = z.object({
    edate: z.string(),
    startIndex: z.number()
});

const sync = createSync({
    description: 'Sync attendance records',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Attendance: AttendanceSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/attendance'
        }
    ],

    exec: async (nango) => {
        const parsedCheckpoint = CheckpointSchema.safeParse(await nango.getCheckpoint());
        const checkpoint = parsedCheckpoint.success ? parsedCheckpoint.data : undefined;
        const today = new Date();
        const todayStr = formatDate(today);
        const todayDate = parseDate(todayStr);
        const WINDOW_SIZE = 7;
        const PAGE_SIZE = 100;

        let currentEdate = checkpoint?.edate ?? todayStr;
        if (parseDate(currentEdate).getTime() > todayDate.getTime()) {
            currentEdate = todayStr;
        }
        let currentStartIndex = checkpoint?.startIndex ?? 1;

        while (parseDate(currentEdate).getTime() <= todayDate.getTime()) {
            const currentSdate = subtractDays(parseDate(currentEdate), WINDOW_SIZE - 1);

            const paginateConfig: {
                type: 'offset';
                offset_name_in_request: string;
                offset_calculation_method: 'by-response-size';
                offset_start_value: number;
                limit_name_in_request: string;
                limit: number;
                response_path: string;
                on_page: (paginationState: { nextPageParam?: string | number | undefined; response: unknown }) => Promise<void>;
            } = {
                type: 'offset',
                offset_name_in_request: 'startIndex',
                offset_calculation_method: 'by-response-size',
                offset_start_value: currentStartIndex,
                limit_name_in_request: 'limit',
                limit: PAGE_SIZE,
                response_path: 'result',
                on_page: async () => {
                    // No-op: checkpoint is saved after each page is processed.
                }
            };

            const proxyConfig: ProxyConfiguration = {
                // https://www.zoho.com/people/api/userreport.html
                endpoint: '/people/api/attendance/getUserReport',
                params: {
                    sdate: currentSdate,
                    edate: currentEdate,
                    startIndex: String(currentStartIndex)
                },
                paginate: paginateConfig,
                retries: 3
            };

            for await (const page of nango.paginate<unknown>(proxyConfig)) {
                const items = z.array(z.unknown()).parse(page);
                if (items.length === 0) {
                    break;
                }

                const records: z.infer<typeof AttendanceSchema>[] = [];
                for (const item of items) {
                    const itemRecord = z
                        .object({
                            attendanceDetails: z.record(z.string(), z.unknown()).optional(),
                            employeeDetails: z.record(z.string(), z.unknown()).optional()
                        })
                        .safeParse(item);

                    if (!itemRecord.success) {
                        throw new Error(`Invalid attendance record shape: ${JSON.stringify(item)}`);
                    }

                    const { attendanceDetails, employeeDetails } = itemRecord.data;
                    if (!attendanceDetails) {
                        continue;
                    }

                    const empId =
                        (typeof employeeDetails?.['id'] === 'string' && employeeDetails['id']) ||
                        (typeof employeeDetails?.['EmployeeID'] === 'string' && employeeDetails['EmployeeID']) ||
                        (typeof employeeDetails?.['erecno'] === 'string' && employeeDetails['erecno']) ||
                        'unknown';
                    const empEmail =
                        (typeof employeeDetails?.['EmailID'] === 'string' && employeeDetails['EmailID']) ||
                        (typeof employeeDetails?.['mail id'] === 'string' && employeeDetails?.['mail id']) ||
                        undefined;
                    const empFirstName =
                        (typeof employeeDetails?.['FirstName'] === 'string' && employeeDetails['FirstName']) ||
                        (typeof employeeDetails?.['first name'] === 'string' && employeeDetails?.['first name']) ||
                        undefined;
                    const empLastName =
                        (typeof employeeDetails?.['LastName'] === 'string' && employeeDetails['LastName']) ||
                        (typeof employeeDetails?.['last name'] === 'string' && employeeDetails?.['last name']) ||
                        undefined;

                    for (const [dateKey, dayData] of Object.entries(attendanceDetails)) {
                        const dayRecord = z.record(z.string(), z.unknown()).safeParse(dayData);
                        if (!dayRecord.success) {
                            throw new Error(`Invalid attendance day shape for ${dateKey}: ${JSON.stringify(dayData)}`);
                        }

                        const d = dayRecord.data;
                        records.push({
                            id: `${empId}_${dateKey}`,
                            employeeId: empId,
                            date: dateKey,
                            ...(empEmail !== undefined ? { employeeEmail: empEmail } : {}),
                            ...(empFirstName !== undefined ? { employeeFirstName: empFirstName } : {}),
                            ...(empLastName !== undefined ? { employeeLastName: empLastName } : {}),
                            ...(typeof d['Status'] === 'string' ? { status: d['Status'] } : {}),
                            ...(typeof d['FirstIn'] === 'string' ? { firstIn: d['FirstIn'] } : {}),
                            ...(typeof d['LastOut'] === 'string' ? { lastOut: d['LastOut'] } : {}),
                            ...(typeof d['TotalHours'] === 'string' ? { totalHours: d['TotalHours'] } : {}),
                            ...(typeof d['WorkingHours'] === 'string' ? { workingHours: d['WorkingHours'] } : {}),
                            ...(typeof d['OverTime'] === 'string' ? { overTime: d['OverTime'] } : {}),
                            ...(typeof d['DeviationTime'] === 'string' ? { deviationTime: d['DeviationTime'] } : {}),
                            ...(typeof d['ShiftName'] === 'string' ? { shiftName: d['ShiftName'] } : {}),
                            ...(typeof d['ShiftStartTime'] === 'string' ? { shiftStartTime: d['ShiftStartTime'] } : {}),
                            ...(typeof d['ShiftEndTime'] === 'string' ? { shiftEndTime: d['ShiftEndTime'] } : {}),
                            ...(typeof d['paidBreakHours'] === 'string' ? { paidBreakHours: d['paidBreakHours'] } : {}),
                            ...(typeof d['unPaidBreakHours'] === 'string' ? { unPaidBreakHours: d['unPaidBreakHours'] } : {}),
                            ...(typeof d['FirstIn_Location'] === 'string' ? { firstInLocation: d['FirstIn_Location'] } : {}),
                            ...(typeof d['LastOut_Location'] === 'string' ? { lastOutLocation: d['LastOut_Location'] } : {})
                        });
                    }
                }

                if (records.length > 0) {
                    await nango.batchSave(records, 'Attendance');
                }

                currentStartIndex += items.length;
                await nango.saveCheckpoint({ edate: currentEdate, startIndex: currentStartIndex });
            }

            if (parseDate(currentEdate).getTime() === todayDate.getTime()) {
                await nango.saveCheckpoint({ edate: currentEdate, startIndex: 1 });
                break;
            }

            currentEdate = addDays(parseDate(currentEdate), 1);
            currentStartIndex = 1;
            await nango.saveCheckpoint({ edate: currentEdate, startIndex: currentStartIndex });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
