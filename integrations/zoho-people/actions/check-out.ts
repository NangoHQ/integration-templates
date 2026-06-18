import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    empId: z.string().describe('Employee ID (alphanumeric, e.g. "S20"). Must belong to an employee with a real Zoho account (ZUID != -1).'),
    checkOut: z.string().describe('Check-out time in HH:MM format (24-hour). Example: "17:30"'),
    attendanceDate: z.string().describe('Attendance date in dd-MMM-yyyy format. Example: "15-Jun-2026"')
});

const ProviderResponseSchema = z.array(z.record(z.string(), z.unknown()));

const OutputSchema = z.object({
    success: z.boolean(),
    message: z.string().optional()
});

const action = createAction({
    description: 'Record an attendance check-out for an employee.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoPeople.attendance.ALL'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.zoho.com/people/api/attendance-checkin-checkout.html
        const response = await nango.post({
            endpoint: '/people/api/attendance',
            params: {
                checkOut: `${input.attendanceDate} ${input.checkOut}:00`,
                dateFormat: 'dd-MMM-yyyy HH:mm:ss',
                empId: input.empId,
                attendanceDate: input.attendanceDate
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const firstItem = providerResponse[0];
        if (firstItem === undefined) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Unexpected empty response array from provider.'
            });
        }

        const responseString = firstItem['response'];
        const message = typeof firstItem['msg'] === 'string' ? firstItem['msg'] : undefined;

        if (typeof responseString === 'string' && responseString.toLowerCase() === 'success') {
            return {
                success: true,
                ...(message !== undefined && { message })
            };
        }

        throw new nango.ActionError({
            type: 'attendance_checkout_failed',
            message: message || 'Check-out failed',
            empId: input.empId,
            attendanceDate: input.attendanceDate
        });
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
