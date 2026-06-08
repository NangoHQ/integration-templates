import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    employeeId: z.string().describe('The employee ID. Example: "123"'),
    fields: z
        .array(z.string())
        .optional()
        .describe('Comma-separated list of fields to include in the response. When omitted, only the employee id is returned.'),
    onlyCurrent: z.boolean().optional().describe('When true (default), returns only currently effective values from historical tables.')
});

const OutputSchema = z
    .object({
        id: z.string()
    })
    .passthrough();

const action = createAction({
    description: 'Retrieve a single employee from BambooHR.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-employee',
        group: 'Employees'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://documentation.bamboohr.com/reference/get-employee
        const response = await nango.get({
            endpoint: `/v1/employees/${encodeURIComponent(input.employeeId)}`,
            headers: {
                Accept: 'application/json'
            },
            params: {
                ...(input.fields !== undefined && input.fields.length > 0 && { fields: input.fields.join(',') }),
                ...(input.onlyCurrent !== undefined && { onlyCurrent: String(input.onlyCurrent) })
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Employee not found',
                employeeId: input.employeeId
            });
        }

        const providerEmployee = OutputSchema.parse(response.data);

        return providerEmployee;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
