import { createSync } from 'nango';

import type { ProxyConfiguration } from 'nango';
import { GustoEmployee } from '../models.js';
import { z } from 'zod';

const CheckpointSchema = z.object({
    page: z.number().int().min(1)
});

const JobSchema = z.object({
    uuid: z.string(),
    version: z.string(),
    employee_uuid: z.string(),
    current_compensation_uuid: z.string(),
    payment_unit: z.string().nullable(),
    primary: z.boolean(),
    title: z.string().nullable(),
    compensations: z.array(z.any()),
    rate: z.string(),
    hire_date: z.string()
});

const PaidTimeOffSchema = z.object({
    name: z.string().nullable(),
    policy_name: z.string().nullable(),
    policy_uuid: z.string().nullable(),
    accrual_unit: z.string().nullable(),
    accrual_rate: z.string().nullable(),
    accrual_method: z.string().nullable().optional(),
    accrual_period: z.string().nullable(),
    accrual_balance: z.string().nullable(),
    maximum_accrual_balance: z.string().nullable(),
    paid_at_termination: z.boolean()
});

const CustomFieldSchema = z.object({
    id: z.string(),
    company_custom_field_id: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    type: z.string(),
    value: z.string(),
    selection_options: z.array(z.string()).nullable().optional()
});

const TerminationSchema = z.object({
    uuid: z.string(),
    version: z.string(),
    employee_uuid: z.string(),
    active: z.boolean(),
    cancelable: z.boolean(),
    effective_date: z.string(),
    run_termination_payroll: z.boolean()
});

const EmployeeResponseSchema = z.object({
    uuid: z.string(),
    first_name: z.string(),
    middle_initial: z.string().nullable(),
    last_name: z.string(),
    email: z.string().nullable(),
    company_uuid: z.string(),
    manager_uuid: z.string().nullable(),
    version: z.string(),
    department: z.string().nullable(),
    department_uuid: z.string().nullable(),
    terminated: z.boolean(),
    two_percent_shareholder: z.boolean().nullable(),
    onboarded: z.boolean(),
    onboarding_status: z.string(),
    jobs: z.array(JobSchema),
    eligible_paid_time_off: z.array(PaidTimeOffSchema),
    terminations: z.array(TerminationSchema),
    garnishments: z.array(z.any()),
    custom_fields: z.array(CustomFieldSchema).optional(),
    date_of_birth: z.string().nullable(),
    has_ssn: z.boolean(),
    ssn: z.string(),
    phone: z.string().nullable(),
    preferred_first_name: z.string().nullable(),
    work_email: z.string().nullable(),
    current_employment_status: z.string().nullable().optional()
});

const EmployeesPageSchema = z.array(EmployeeResponseSchema);

/**
 * Fetches all employees from Gusto and maps them to the GustoEmployee model
 */
const sync = createSync({
    description: 'Fetches all employees from Gusto',
    version: '1.1.0',
    frequency: 'every 5m',
    autoStart: false,
    syncType: 'full',
    checkpoint: CheckpointSchema,

    endpoints: [
        {
            method: 'GET',
            path: '/employees',
            group: 'Employees'
        }
    ],

    models: {
        GustoEmployee: GustoEmployee
    },

    metadata: z.object({}),

    exec: async (nango) => {
        // Blocker: provider only exposes /v1/companies/{company_id}/employees with no changed-since filter,
        // no deleted-record endpoint, and no resumable cursor.
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint ? CheckpointSchema.parse(rawCheckpoint) : null;
        let page: number = checkpoint?.page ?? 1;

        const connection = await nango.getConnection();

        const companyUuid = connection.connection_config['companyUuid'];

        if (!companyUuid) {
            throw new nango.ActionError({
                message: 'Company UUID is missing from the connection configuration'
            });
        }

        await nango.trackDeletesStart('GustoEmployee');

        while (true) {
            const proxyConfig: ProxyConfiguration = {
                // https://docs.gusto.com/embedded-payroll/reference/get-v1-companies-company_id-employees
                endpoint: `/v1/companies/${companyUuid}/employees`,
                params: {
                    page,
                    per_page: 100
                },
                retries: 10
            };

            const response = await nango.get(proxyConfig);
            const employees = EmployeesPageSchema.parse(response.data);

            if (employees.length === 0) {
                break;
            }

            // Map employees to GustoEmployee model
            const mappedEmployees = employees.map((employee) => ({
                id: employee.uuid,
                uuid: employee.uuid,
                first_name: employee.first_name,
                middle_initial: employee.middle_initial,
                last_name: employee.last_name,
                email: employee.email,
                company_uuid: employee.company_uuid,
                manager_uuid: employee.manager_uuid,
                version: employee.version,
                department: employee.department,
                department_uuid: employee.department_uuid,
                terminated: employee.terminated,
                two_percent_shareholder: employee.two_percent_shareholder,
                onboarded: employee.onboarded,
                onboarding_status: employee.onboarding_status,
                jobs: employee.jobs.map((job) => ({
                    id: job.uuid,
                    ...job
                })),
                eligible_paid_time_off: employee.eligible_paid_time_off,
                terminations: employee.terminations,
                custom_fields:
                    employee.custom_fields?.map((field) => ({
                        ...field,
                        selection_options: field.selection_options ?? undefined
                    })) || [],
                garnishments: employee.garnishments,
                date_of_birth: employee.date_of_birth,
                has_ssn: employee.has_ssn,
                ssn: employee.ssn,
                phone: employee.phone,
                preferred_first_name: employee.preferred_first_name,
                work_email: employee.work_email
            }));

            await nango.log(`Saving batch of ${mappedEmployees.length} employee(s)`);
            await nango.batchSave(mappedEmployees, 'GustoEmployee');

            page++;
            await nango.saveCheckpoint({ page });
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('GustoEmployee');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
