import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const EmployeeSchema = z.object({
    id: z.string(),
    firstname: z.string().optional().nullable(),
    lastname: z.string().optional().nullable(),
    email: z.string().optional().nullable(),
    start_date: z.string().optional().nullable(),
    state: z.string(),
    employee_number: z.string().optional().nullable(),
    avatar: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    job_title: z.string().optional().nullable(),
    manager_id: z.string().optional().nullable(),
    department_id: z.string().optional().nullable(),
    template_id: z.string().optional().nullable(),
    division_id: z.string().optional().nullable(),
    candidate_id: z.string().optional().nullable(),
    legal_entity_id: z.string().optional().nullable(),
    work_schedule_id: z.string().optional().nullable(),
    work_email: z.string().optional().nullable(),
    preferred_name: z.string().optional().nullable(),
    onboarding_member_id: z.string().optional().nullable(),
    sample: z.boolean().optional().nullable(),
    holiday_calendar_id: z.number().optional().nullable(),
    avatar_processed: z.boolean().optional().nullable(),
    status_semantic_type: z.string().optional().nullable(),
    reporting_line: z.array(z.number()).optional().nullable(),
    birthdate: z.string().optional().nullable()
});

const MemberSchema = z.object({
    id: z.string(),
    name: z.string().optional().nullable(),
    email: z.string().optional().nullable(),
    role: z.string().optional().nullable(),
    hris_role: z.string().optional().nullable(),
    roles: z.array(z.string()).optional().nullable(),
    active: z.boolean().optional().nullable()
});

const MembersResponseSchema = z.object({
    members: z.array(MemberSchema)
});

const sync = createSync({
    description: 'Sync HR employee records.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Employee: EmployeeSchema
    },

    exec: async (nango) => {
        // https://workable.readme.io/reference/members.md
        const membersResponse = await nango.get({
            endpoint: '/spi/v3/members',
            params: {
                limit: 100
            },
            retries: 3
        });

        const membersParsed = MembersResponseSchema.safeParse(membersResponse.data);
        if (!membersParsed.success) {
            throw new Error(`Failed to parse members response: ${membersParsed.error.message}`);
        }

        const adminMember = membersParsed.data.members.find((m) => m.active === true && (m.hris_role === 'hris_admin' || m.role === 'admin'));
        const memberId = adminMember?.id;

        // https://workable.readme.io/reference/employees.md
        const proxyConfig: ProxyConfiguration = {
            // https://workable.readme.io/reference/employees.md
            endpoint: '/spi/v3/employees',
            params: {
                limit: 100,
                ...(memberId && { member_id: memberId })
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'offset',
                offset_start_value: 0,
                offset_calculation_method: 'by-response-size',
                limit_name_in_request: 'limit',
                limit: 100,
                response_path: 'employees'
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const employees = page.map((record) => {
                const parsed = EmployeeSchema.safeParse(record);
                if (!parsed.success) {
                    throw new Error(`Failed to parse employee: ${parsed.error.message}`);
                }

                return {
                    id: parsed.data.id,
                    ...(parsed.data.firstname != null && { firstname: parsed.data.firstname }),
                    ...(parsed.data.lastname != null && { lastname: parsed.data.lastname }),
                    ...(parsed.data.email != null && { email: parsed.data.email }),
                    ...(parsed.data.start_date != null && { start_date: parsed.data.start_date }),
                    state: parsed.data.state,
                    ...(parsed.data.employee_number != null && { employee_number: parsed.data.employee_number }),
                    ...(parsed.data.avatar != null && { avatar: parsed.data.avatar }),
                    ...(parsed.data.phone != null && { phone: parsed.data.phone }),
                    ...(parsed.data.address != null && { address: parsed.data.address }),
                    ...(parsed.data.job_title != null && { job_title: parsed.data.job_title }),
                    ...(parsed.data.manager_id != null && { manager_id: parsed.data.manager_id }),
                    ...(parsed.data.department_id != null && { department_id: parsed.data.department_id }),
                    ...(parsed.data.template_id != null && { template_id: parsed.data.template_id }),
                    ...(parsed.data.division_id != null && { division_id: parsed.data.division_id }),
                    ...(parsed.data.candidate_id != null && { candidate_id: parsed.data.candidate_id }),
                    ...(parsed.data.legal_entity_id != null && { legal_entity_id: parsed.data.legal_entity_id }),
                    ...(parsed.data.work_schedule_id != null && { work_schedule_id: parsed.data.work_schedule_id }),
                    ...(parsed.data.work_email != null && { work_email: parsed.data.work_email }),
                    ...(parsed.data.preferred_name != null && { preferred_name: parsed.data.preferred_name }),
                    ...(parsed.data.onboarding_member_id != null && { onboarding_member_id: parsed.data.onboarding_member_id }),
                    ...(parsed.data.sample != null && { sample: parsed.data.sample }),
                    ...(parsed.data.holiday_calendar_id != null && { holiday_calendar_id: parsed.data.holiday_calendar_id }),
                    ...(parsed.data.avatar_processed != null && { avatar_processed: parsed.data.avatar_processed }),
                    ...(parsed.data.status_semantic_type != null && { status_semantic_type: parsed.data.status_semantic_type }),
                    ...(parsed.data.reporting_line != null && { reporting_line: parsed.data.reporting_line }),
                    ...(parsed.data.birthdate != null && { birthdate: parsed.data.birthdate })
                };
            });

            if (employees.length > 0) {
                await nango.batchSave(employees, 'Employee');
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
