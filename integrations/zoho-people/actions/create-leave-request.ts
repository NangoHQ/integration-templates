import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    employeeRecordId: z.string().describe('Zoho internal record ID of the employee. Example: "972601000000306080"'),
    leaveTypeId: z.string().describe('Leave type ID (not name). Example: "972601000000306562"'),
    fromDate: z.string().describe('Start date in dd-MMM-yyyy format. Example: "16-Jun-2026"'),
    toDate: z.string().describe('End date in dd-MMM-yyyy format. Example: "17-Jun-2026"'),
    daysTaken: z.string().describe('Number of days as a string. Example: "2"')
});

const ProviderResponseSchema = z.object({
    response: z
        .object({
            result: z
                .object({
                    pkId: z.string().optional()
                })
                .optional(),
            message: z.string().optional(),
            status: z.number().optional(),
            uri: z.string().optional()
        })
        .optional()
});

const OutputSchema = z.object({
    id: z.string().describe('The newly created leave record ID'),
    message: z.string().optional()
});

const action = createAction({
    description: 'Submit a leave request for an employee',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-leave-request',
        group: 'Leave'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoPeople.leave.ALL'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const inputData = JSON.stringify({
            From: input.fromDate,
            To: input.toDate,
            Leavetype: input.leaveTypeId,
            Employee_ID: input.employeeRecordId,
            Daystaken: input.daysTaken
        });

        // https://www.zoho.com/people/api/leave.html
        const response = await nango.post({
            endpoint: '/people/api/forms/json/leave/insertRecord',
            params: {
                inputData
            },
            retries: 10
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const status = providerResponse.response?.status;
        const message = providerResponse.response?.message;
        const pkId = providerResponse.response?.result?.pkId;

        if (status !== 0 || !pkId) {
            throw new nango.ActionError({
                type: 'create_failed',
                message: message || 'Failed to create leave request',
                status: status,
                input: inputData
            });
        }

        return {
            id: pkId,
            ...(message && { message })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
