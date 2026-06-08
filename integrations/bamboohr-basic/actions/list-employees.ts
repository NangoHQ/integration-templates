import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    onlyCurrent: z
        .boolean()
        .optional()
        .describe('When true, only employees whose hire date and employment-status effective date are on or before today are returned. Defaults to true.'),
    cursor: z.string().optional().describe('Pagination cursor from a previous response. Not used by this endpoint; present for API consistency.')
});

const EmployeeSchema = z
    .object({
        id: z.string()
    })
    .passthrough();

const OutputSchema = z.object({
    employees: z.array(EmployeeSchema),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List employees from BambooHR.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-employees',
        group: 'Employees'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['employee_directory'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://documentation.bamboohr.com/reference/get-employees-directory
            endpoint: '/v1/employees/directory',
            headers: {
                Accept: 'application/json'
            },
            params: {
                ...(input.onlyCurrent !== undefined && { onlyCurrent: String(input.onlyCurrent) }),
                ...(input.cursor !== undefined && { cursor: input.cursor })
            },
            retries: 3
        });

        const ProviderResponseSchema = z.object({
            fields: z.array(z.unknown()).optional(),
            employees: z.array(EmployeeSchema).optional()
        });

        const rawData = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
        const parsed = ProviderResponseSchema.parse(rawData);
        const employees = parsed.employees ?? [];

        return {
            employees
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
