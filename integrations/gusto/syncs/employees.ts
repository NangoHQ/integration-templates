import type { NangoSync, ProxyConfiguration } from '../../models';
import type { EmployeeResponse, GustoEmployee } from '../types.js';

/**
 * Fetches all employees from Gusto and maps them to the GustoEmployee model
 */
export default async function fetchData(nango: NangoSync) {
    const connection = await nango.getConnection();

    const companyUuid = connection.connection_config['companyUuid'];

    if (!companyUuid) {
        throw new nango.ActionError({
            message: 'Company UUID is missing from the connection configuration'
        });
    }

    const proxyConfig: ProxyConfiguration = {
        // https://docs.gusto.com/embedded-payroll/reference/get-v1-companies-company_id-employees
        endpoint: `/v1/companies/${companyUuid}/employees`,
        retries: 10,
        paginate: {
            type: 'offset',
            offset_name_in_request: 'page',
            response_path: '',
            limit_name_in_request: 'per_page',
            limit: 100
        }
    };

    for await (const employees of nango.paginate<EmployeeResponse>(proxyConfig)) {
        // Map employees to GustoEmployee model
        const mappedEmployees: GustoEmployee[] = employees.map((employee: EmployeeResponse) => ({
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
            jobs: employee.jobs,
            eligible_paid_time_off: employee.eligible_paid_time_off,
            terminations: employee.terminations,
            custom_fields: employee.custom_fields || [],
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
    }
}
