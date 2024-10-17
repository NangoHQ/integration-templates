import type { NangoSync, ProxyConfiguration, User } from '../../models';
import type { EmployeeResponse } from '../types';

export default async function fetchData(nango: NangoSync) {
    const connection = await nango.getConnection();

    const companyUuid = connection.connection_config['companyUuid'];

    if (!companyUuid) {
        throw new nango.ActionError({
            message: 'Company UUID is missing from the connection configuration'
        });
    }

    const config: ProxyConfiguration = {
        // https://docs.gusto.com/embedded-payroll/reference/get-v1-companies-company_id-employees
        endpoint: `/v1/companies/${companyUuid}/employees`,
        paginate: {
            type: 'offset',
            offset_name_in_request: 'page',
            response_path: '',
            limit_name_in_request: 'per'
        }
    };

    for await (const gUsers of nango.paginate<EmployeeResponse>(config)) {
        const users: User[] = gUsers.map((gUser: EmployeeResponse) => {
            return {
                id: gUser.uuid,
                firstName: gUser.first_name,
                lastName: gUser.last_name,
                email: gUser.email
            };
        });

        await nango.batchSave(users, 'User');
    }
}
