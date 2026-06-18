import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    firstName: z.string().describe('Legal first name. Example: "John"'),
    lastName: z.string().describe('Legal last name. Example: "Doe"'),
    workEmail: z.string().optional().describe('Work email address. Example: "john.doe@example.com"'),
    jobTitle: z.string().optional().describe('Job title. Example: "Software Engineer"'),
    department: z.string().optional().describe('Department name. Example: "Engineering"'),
    hireDate: z.string().optional().describe('Hire date in YYYY-MM-DD format. Example: "2024-01-15"')
});

const OutputSchema = z.object({
    id: z.string().describe('Employee ID. Example: "123"'),
    firstName: z.string(),
    lastName: z.string(),
    workEmail: z.string().optional(),
    jobTitle: z.string().optional(),
    department: z.string().optional(),
    hireDate: z.string().optional()
});

const action = createAction({
    description: 'Create an employee in BambooHR',
    version: '3.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://documentation.bamboohr.com/reference/create-employee
            endpoint: '/v1/employees',
            data: {
                firstName: input.firstName,
                lastName: input.lastName,
                ...(input.workEmail !== undefined && { workEmail: input.workEmail }),
                ...(input.jobTitle !== undefined && { jobTitle: input.jobTitle }),
                ...(input.department !== undefined && { department: input.department }),
                ...(input.hireDate !== undefined && { hireDate: input.hireDate })
            },
            retries: 3
        });

        if (response.status !== 201) {
            throw new nango.ActionError({
                type: 'create_failed',
                message: `Failed to create employee: received status ${response.status}`
            });
        }

        const location = response.headers['location'] || response.headers['Location'];
        let employeeId: string | undefined;
        if (typeof location === 'string') {
            const match = location.match(/\/employees\/(\d+)$/);
            if (match && match[1]) {
                employeeId = match[1];
            }
        }

        if (!employeeId) {
            throw new nango.ActionError({
                type: 'missing_employee_id',
                message: 'Employee created but ID could not be determined from response'
            });
        }

        return {
            id: employeeId,
            firstName: input.firstName,
            lastName: input.lastName,
            ...(input.workEmail !== undefined && { workEmail: input.workEmail }),
            ...(input.jobTitle !== undefined && { jobTitle: input.jobTitle }),
            ...(input.department !== undefined && { department: input.department }),
            ...(input.hireDate !== undefined && { hireDate: input.hireDate })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
