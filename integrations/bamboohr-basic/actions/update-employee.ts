import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    employeeId: z.string().describe('The employee ID. Example: "123"'),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    workEmail: z.string().optional(),
    jobTitle: z.string().optional(),
    department: z.string().optional(),
    division: z.string().optional(),
    location: z.string().optional(),
    hireDate: z.string().optional().describe('Hire date in YYYY-MM-DD format. Example: "2024-01-15"'),
    mobilePhone: z.string().optional(),
    homePhone: z.string().optional(),
    workPhone: z.string().optional(),
    address1: z.string().optional(),
    address2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipcode: z.string().optional(),
    country: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    status: z.string().optional(),
    workEmail: z.string().optional(),
    jobTitle: z.string().optional(),
    department: z.string().optional(),
    division: z.string().optional(),
    location: z.string().optional(),
    hireDate: z.string().optional(),
    mobilePhone: z.string().optional(),
    homePhone: z.string().optional(),
    workPhone: z.string().optional(),
    address1: z.string().optional(),
    address2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipcode: z.string().optional(),
    country: z.string().optional()
});

const action = createAction({
    description: 'Update an employee in BambooHR.',
    version: '3.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['employee:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: Record<string, string> = {};

        if (input.firstName !== undefined) {
            data['firstName'] = input.firstName;
        }
        if (input.lastName !== undefined) {
            data['lastName'] = input.lastName;
        }
        if (input.workEmail !== undefined) {
            data['workEmail'] = input.workEmail;
        }
        if (input.jobTitle !== undefined) {
            data['jobTitle'] = input.jobTitle;
        }
        if (input.department !== undefined) {
            data['department'] = input.department;
        }
        if (input.division !== undefined) {
            data['division'] = input.division;
        }
        if (input.location !== undefined) {
            data['location'] = input.location;
        }
        if (input.hireDate !== undefined) {
            data['hireDate'] = input.hireDate;
        }
        if (input.mobilePhone !== undefined) {
            data['mobilePhone'] = input.mobilePhone;
        }
        if (input.homePhone !== undefined) {
            data['homePhone'] = input.homePhone;
        }
        if (input.workPhone !== undefined) {
            data['workPhone'] = input.workPhone;
        }
        if (input.address1 !== undefined) {
            data['address1'] = input.address1;
        }
        if (input.address2 !== undefined) {
            data['address2'] = input.address2;
        }
        if (input.city !== undefined) {
            data['city'] = input.city;
        }
        if (input.state !== undefined) {
            data['state'] = input.state;
        }
        if (input.zipcode !== undefined) {
            data['zipcode'] = input.zipcode;
        }
        if (input.country !== undefined) {
            data['country'] = input.country;
        }

        // https://documentation.bamboohr.com/reference/update-employee
        const response = await nango.post({
            endpoint: `/v1/employees/${encodeURIComponent(input.employeeId)}`,
            data,
            retries: 10
        });

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
