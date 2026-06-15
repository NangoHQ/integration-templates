import { z } from 'zod';
import { createAction } from 'nango';

const DateRangeEnum = z.enum(['today', 'yesterday', 'thisWeek', 'lastWeek', 'thisMonth', 'lastMonth']);

const InputSchema = z
    .object({
        empId: z.string().describe("Employee's alphanumeric ID. Example: 'S20'"),
        dateRange: DateRangeEnum.optional().describe("Predefined date range: 'today', 'yesterday', 'thisWeek', 'lastWeek', 'thisMonth', 'lastMonth'"),
        date: z.string().optional().describe("Specific day in dd-MMM-yyyy format. Example: '15-Jun-2026'")
    })
    .refine((data) => data.dateRange !== undefined || data.date !== undefined, {
        message: 'Either dateRange or date must be provided'
    });

const AttendanceEntrySchema = z.object({
    checkIn: z.string().optional(),
    checkOut: z.string().optional(),
    checkIn_Location: z.string().optional(),
    checkOut_Location: z.string().optional(),
    checkIn_Building: z.string().optional(),
    checkOut_Building: z.string().optional(),
    sourceOfPunchIn: z.string().optional(),
    sourceOfPunchOut: z.string().optional()
});

const ProviderResponseSchema = z.object({
    firstIn: z.string().optional(),
    lastOut: z.string().optional(),
    totalHrs: z.string().optional(),
    entries: z.array(AttendanceEntrySchema).optional(),
    firstIn_Building: z.string().optional(),
    lastOut_Building: z.string().optional(),
    firstIn_Location: z.string().optional(),
    lastOut_Location: z.string().optional(),
    unPaidBreak: z.string().optional(),
    paidBreak: z.string().optional(),
    status: z.string().optional(),
    allowedToCheckIn: z.boolean().optional()
});

const OutputSchema = z.object({
    firstIn: z.string().optional(),
    lastOut: z.string().optional(),
    totalHrs: z.string().optional(),
    entries: z.array(AttendanceEntrySchema).optional(),
    firstIn_Building: z.string().optional(),
    lastOut_Building: z.string().optional(),
    firstIn_Location: z.string().optional(),
    lastOut_Location: z.string().optional(),
    unPaidBreak: z.string().optional(),
    paidBreak: z.string().optional(),
    status: z.string().optional(),
    allowedToCheckIn: z.boolean().optional()
});

const action = createAction({
    description: 'Get attendance entries for a specific employee on a given day or date range',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-employee-attendance',
        group: 'Attendance'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZOHOPEOPLE.attendance.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string> = {
            empId: input.empId
        };

        if (input.dateRange !== undefined) {
            params['dateRange'] = input.dateRange;
        }

        if (input.date !== undefined) {
            params['date'] = input.date;
        }

        const response = await nango.get({
            // https://www.zoho.com/people/api/attendance-entries.html
            endpoint: '/people/api/attendance/getAttendanceEntries',
            params,
            retries: 3
        });

        const errorResponse = z.object({ error: z.string() }).safeParse(response.data);
        if (errorResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_user',
                message: errorResponse.data.error,
                empId: input.empId
            });
        }

        const providerData = ProviderResponseSchema.parse(response.data);

        return {
            ...(providerData.firstIn !== undefined && { firstIn: providerData.firstIn }),
            ...(providerData.lastOut !== undefined && { lastOut: providerData.lastOut }),
            ...(providerData.totalHrs !== undefined && { totalHrs: providerData.totalHrs }),
            ...(providerData.entries !== undefined && { entries: providerData.entries }),
            ...(providerData.firstIn_Building !== undefined && { firstIn_Building: providerData.firstIn_Building }),
            ...(providerData.lastOut_Building !== undefined && { lastOut_Building: providerData.lastOut_Building }),
            ...(providerData.firstIn_Location !== undefined && { firstIn_Location: providerData.firstIn_Location }),
            ...(providerData.lastOut_Location !== undefined && { lastOut_Location: providerData.lastOut_Location }),
            ...(providerData.unPaidBreak !== undefined && { unPaidBreak: providerData.unPaidBreak }),
            ...(providerData.paidBreak !== undefined && { paidBreak: providerData.paidBreak }),
            ...(providerData.status !== undefined && { status: providerData.status }),
            ...(providerData.allowedToCheckIn !== undefined && { allowedToCheckIn: providerData.allowedToCheckIn })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
