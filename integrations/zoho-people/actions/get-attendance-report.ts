import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    sdate: z.string().describe('Start date in dd-MMM-yyyy format. Example: 15-Jun-2026'),
    edate: z.string().describe('End date in dd-MMM-yyyy format. Example: 15-Jun-2026'),
    startIndex: z.number().optional().describe('1-based pagination index. Omit for the first page.')
});

const AttendanceDaySchema = z.record(z.string(), z.unknown());

const AttendanceRecordSchema = z.object({
    attendanceDetails: z.record(z.string(), AttendanceDaySchema).optional(),
    employeeDetails: z.record(z.string(), z.unknown()).optional()
});

const OutputSchema = z.object({
    records: z.array(AttendanceRecordSchema),
    nextStartIndex: z.number().optional()
});

const ProviderResponseSchema = z.object({
    response: z
        .object({
            result: z.array(z.unknown()).optional(),
            status: z.number().optional(),
            message: z.string().optional(),
            uri: z.string().optional()
        })
        .optional(),
    result: z.array(z.unknown()).optional(),
    status: z.number().optional(),
    message: z.string().optional(),
    uri: z.string().optional()
});

const action = createAction({
    description: 'Get attendance report for all employees over a date window',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const startIndex = input.startIndex ?? 1;
        const limit = 200;

        // https://www.zoho.com/people/api/userreport.html
        const response = await nango.get({
            endpoint: '/people/api/attendance/getUserReport',
            params: {
                sdate: input.sdate,
                edate: input.edate,
                startIndex: String(startIndex),
                limit: String(limit)
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const status = providerResponse.response?.status ?? providerResponse.status;
        const rawResult = providerResponse.response?.result ?? providerResponse.result;

        if (status === 1) {
            const message = providerResponse.response?.message ?? providerResponse.message ?? 'Unknown error';
            throw new nango.ActionError({
                type: 'provider_error',
                message: message
            });
        }

        const result = rawResult ?? [];
        const records = result.map((item) => AttendanceRecordSchema.parse(item));
        const hasMore = records.length === limit;

        return {
            records: records,
            ...(hasMore && { nextStartIndex: startIndex + limit })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
