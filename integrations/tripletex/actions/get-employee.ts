import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('Employee ID. Example: 11966637')
});

const ProviderEmployeeSchema = z
    .object({
        id: z.number(),
        firstName: z.string().nullable().optional(),
        lastName: z.string().nullable().optional(),
        email: z.string().nullable().optional(),
        employeeNumber: z.string().nullable().optional(),
        department: z
            .object({
                id: z.number()
            })
            .nullable()
            .optional(),
        phoneNumberMobile: z.string().nullable().optional(),
        phoneNumberWork: z.string().nullable().optional(),
        dateOfBirth: z.string().nullable().optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    value: ProviderEmployeeSchema
});

const OutputSchema = z.object({
    id: z.number(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().optional(),
    employeeNumber: z.string().optional(),
    departmentId: z.number().optional(),
    phoneNumberMobile: z.string().optional(),
    phoneNumberWork: z.string().optional(),
    dateOfBirth: z.string().optional()
});

const action = createAction({
    description: 'Retrieve an employee.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.tripletex.no/docs/documentation/topic-3/openapi/
            endpoint: `v2/employee/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const employee = providerResponse.value;

        return {
            id: employee.id,
            ...(employee.firstName != null && { firstName: employee.firstName }),
            ...(employee.lastName != null && { lastName: employee.lastName }),
            ...(employee.email != null && { email: employee.email }),
            ...(employee.employeeNumber != null && { employeeNumber: employee.employeeNumber }),
            ...(employee.department != null && { departmentId: employee.department.id }),
            ...(employee.phoneNumberMobile != null && { phoneNumberMobile: employee.phoneNumberMobile }),
            ...(employee.phoneNumberWork != null && { phoneNumberWork: employee.phoneNumberWork }),
            ...(employee.dateOfBirth != null && { dateOfBirth: employee.dateOfBirth })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
