import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    empId: z.string().describe('Employee ID (alphanumeric). Example: "S20"'),
    attendanceDate: z.string().describe('Attendance date in dd-MMM-yyyy format. Example: "15-Jun-2026"'),
    checkIn: z.string().describe('Check-in time in HH:MM format. Example: "09:00"')
});

const ProviderResponseSchema = z.object({
    response: z
        .object({
            result: z.unknown().optional(),
            message: z.string().optional(),
            uri: z.string().optional(),
            status: z.number().optional()
        })
        .optional()
});

const OutputSchema = z.object({
    success: z.boolean(),
    message: z.string().optional(),
    recordId: z.string().optional()
});

function isRecord(obj: unknown): obj is Record<string, unknown> {
    return obj !== null && typeof obj === 'object' && !Array.isArray(obj);
}

function getStringProperty(obj: unknown, key: string): string | undefined {
    if (isRecord(obj)) {
        const val = obj[key];
        if (typeof val === 'string') {
            return val;
        }
    }
    return undefined;
}

const action = createAction({
    description: 'Record an attendance check-in for an employee.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/check-in',
        group: 'Attendance'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoPeople.attendance.ALL'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://www.zoho.com/people/api/attendance-checkin-checkout.html
            endpoint: '/people/api/attendance',
            params: {
                checkIn: input.checkIn,
                empId: input.empId,
                attendanceDate: input.attendanceDate
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            if (typeof response.data === 'string') {
                if (response.data === 'Invalid User') {
                    return {
                        success: false,
                        message: 'The employee is not a valid Zoho user (ZUID may be -1). Check-in requires a real Zoho account.'
                    };
                }
                return {
                    success: true,
                    message: response.data
                };
            }

            if (Array.isArray(response.data)) {
                const first = response.data[0];
                if (isRecord(first)) {
                    const msg = getStringProperty(first, 'msg');
                    const resp = getStringProperty(first, 'response');
                    if (resp === 'failure') {
                        return {
                            success: false,
                            message: msg || 'Check-in failed'
                        };
                    }
                    return {
                        success: true,
                        message: msg || 'Check-in recorded'
                    };
                }
            }

            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Provider returned an unexpected response format.'
            });
        }

        const data = parsed.data.response;
        if (data && data.status !== undefined && data.status !== 0) {
            const message = data.message || 'Check-in failed';
            throw new nango.ActionError({
                type: 'check_in_failed',
                message: message,
                status: data.status
            });
        }

        const result = data?.result;
        const recordId = getStringProperty(result, 'pkId');

        return {
            success: true,
            message: data?.message || 'Check-in recorded successfully',
            ...(recordId !== undefined && { recordId })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
