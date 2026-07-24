import { z } from 'zod';
import { createAction } from 'nango';

const EmploymentGroupValueSchema = z.object({
    employment_effective_date: z.string(),
    employment_status: z.string()
});

const EmploymentGroupSchema = z.object({
    is_primary: z.boolean(),
    value: EmploymentGroupValueSchema
});

const EmployeeInputSchema = z
    .object({
        firstname: z.string(),
        lastname: z.string(),
        work_email: z.string(),
        job_title: z.string(),
        start_date: z.string(),
        employment_group: z.array(EmploymentGroupSchema),
        legal_entity: z.string().optional(),
        department: z.string().optional(),
        work_schedule: z.string().optional()
    })
    .passthrough();

const InputSchema = z.object({
    member_id: z.string().describe('Acting admin member ID. Example: "1f395d"'),
    state: z.enum(['draft', 'published']).describe('Employee state'),
    employee: EmployeeInputSchema
});

const ProviderEmployeeSchema = z
    .object({
        id: z.string(),
        firstname: z.string().optional().nullable(),
        lastname: z.string().optional().nullable(),
        email: z.string().optional().nullable(),
        start_date: z.string().optional().nullable(),
        state: z.string().optional().nullable(),
        employee_number: z.string().optional().nullable(),
        avatar: z.unknown().optional().nullable(),
        phone: z.string().optional().nullable(),
        job_title: z.string().optional().nullable(),
        manager_id: z.string().optional().nullable(),
        department_id: z.string().optional().nullable(),
        template_id: z.unknown().optional().nullable(),
        division_id: z.unknown().optional().nullable(),
        candidate_id: z.unknown().optional().nullable(),
        roles: z.unknown().optional().nullable(),
        legal_entity_id: z.string().optional().nullable(),
        work_schedule_id: z.string().optional().nullable(),
        work_email: z.string().optional().nullable(),
        address: z.unknown().optional().nullable()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string(),
    firstname: z.string().optional(),
    lastname: z.string().optional(),
    email: z.string().optional(),
    start_date: z.string().optional(),
    state: z.string().optional(),
    employee_number: z.string().optional(),
    phone: z.string().optional(),
    job_title: z.string().optional(),
    manager_id: z.string().optional(),
    department_id: z.string().optional(),
    legal_entity_id: z.string().optional(),
    work_schedule_id: z.string().optional(),
    work_email: z.string().optional(),
    address: z.unknown().optional()
});

const action = createAction({
    description: 'Create a new HR employee record.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['w_employees'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://workable.readme.io/reference/create-employee
            endpoint: '/spi/v3/employees',
            data: {
                member_id: input.member_id,
                state: input.state,
                employee: input.employee
            },
            retries: 3
        });

        const providerEmployee = ProviderEmployeeSchema.parse(response.data);

        return {
            id: providerEmployee.id,
            ...(providerEmployee.firstname != null && { firstname: providerEmployee.firstname }),
            ...(providerEmployee.lastname != null && { lastname: providerEmployee.lastname }),
            ...(providerEmployee.email != null && { email: providerEmployee.email }),
            ...(providerEmployee.start_date != null && { start_date: providerEmployee.start_date }),
            ...(providerEmployee.state != null && { state: providerEmployee.state }),
            ...(providerEmployee.employee_number != null && { employee_number: providerEmployee.employee_number }),
            ...(providerEmployee.phone != null && { phone: providerEmployee.phone }),
            ...(providerEmployee.job_title != null && { job_title: providerEmployee.job_title }),
            ...(providerEmployee.manager_id != null && { manager_id: providerEmployee.manager_id }),
            ...(providerEmployee.department_id != null && { department_id: providerEmployee.department_id }),
            ...(providerEmployee.legal_entity_id != null && { legal_entity_id: providerEmployee.legal_entity_id }),
            ...(providerEmployee.work_schedule_id != null && { work_schedule_id: providerEmployee.work_schedule_id }),
            ...(providerEmployee.work_email != null && { work_email: providerEmployee.work_email }),
            ...(providerEmployee.address != null && { address: providerEmployee.address })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
