import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        FirstName: z.string().optional().describe('First name of the employee. Example: "John"'),
        LastName: z.string().optional().describe('Last name of the employee. Example: "Doe"'),
        EmailID: z.string().optional().describe('Email ID of the employee. Example: "john@example.com"'),
        Department: z.string().optional().describe('Department ID. Example: "972601000000306078"'),
        Dateofjoining: z.string().optional().describe('Date of joining in dd-MMM-yyyy format. Example: "15-Jun-2026"'),
        EmployeeID: z.string().optional().describe('Employee ID. Example: "S21"')
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    response: z.object({
        status: z.number(),
        result: z
            .object({
                pkId: z.string()
            })
            .optional(),
        message: z.string().optional()
    })
});

const OutputSchema = z.object({
    id: z.string().describe('The newly created employee record ID')
});

const action = createAction({
    description: 'Create an employee record',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://www.zoho.com/people/api/overview.html
            endpoint: '/people/api/forms/json/employee/insertRecord',
            params: {
                inputData: JSON.stringify(input)
            },
            retries: 10
        };

        const response = await nango.post(config);
        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.response.status !== 0) {
            throw new nango.ActionError({
                type: 'create_failed',
                message: providerResponse.response.message || 'Failed to create employee'
            });
        }

        const recordId = providerResponse.response.result?.pkId;
        if (!recordId) {
            throw new nango.ActionError({
                type: 'missing_record_id',
                message: 'Create succeeded but no record ID was returned'
            });
        }

        return {
            id: recordId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
