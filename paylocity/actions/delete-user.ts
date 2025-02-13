import type { EmailEntity, NangoAction, ProxyConfiguration, SuccessResponse } from '../../models';
import { emailEntitySchema } from '../../schema.zod';
import type { PaylocityUser, PaylocityUsersResp } from '../types';

/**
 * Action: disableUserByEmail
 *
 * 1. Read `companyId` from connection config.
 * 2. Paginate GET /employees => returns only { employeeId, statusCode, statusTypeCode }.
 * 3. For each record, call GET /employees/{employeeId} => fetch full user with email.
 * 4. Compare homeAddress.homeEmail / workAddress.workEmail to input email.
 * 5. Once found, PATCH user => set status to "T" (Terminated).
 */
export default async function runAction(nango: NangoAction, input: EmailEntity): Promise<SuccessResponse> {
    const parseResult = emailEntitySchema.safeParse(input);
    if (!parseResult.success) {
        const msg = parseResult.error.errors.map((e) => e.message).join('; ');
        throw new nango.ActionError({
            message: `Invalid disable-user input: ${msg}`
        });
    }

    const { email } = parseResult.data;

    const connection = await nango.getConnection();
    const companyId = connection.connection_config['companyId'];

    const listConfig: ProxyConfiguration = {
        // https://developer.paylocity.com/integrations/reference/get-all-employees
        endpoint: `/api/v2/companies/${companyId}/employees`,
        retries: 10,
        paginate: {
            type: 'offset',
            offset_name_in_request: 'pagenumber',
            limit_name_in_request: 'pagesize',
            offset_calculation_method: 'per-page',
            limit: 100
        }
    };

    let foundEmployeeId: string | undefined;

    function matchesEmail(emp: PaylocityUser, targetEmail: string): boolean {
        const homeEmail = emp.homeAddress?.emailAddress?.toLowerCase();
        const workEmail = emp.workAddress?.emailAddress?.toLowerCase();
        return homeEmail === targetEmail.toLowerCase() || workEmail === targetEmail.toLowerCase();
    }

    for await (const employeesPage of nango.paginate<PaylocityUsersResp>(listConfig)) {
        for (const partialEmp of employeesPage) {
            const empId = partialEmp.employeeId;
            if (!empId) continue;

            const getConfig: ProxyConfiguration = {
                // https://developer.paylocity.com/integrations/reference/get-employee
                endpoint: `/api/v2/companies/${companyId}/employees/${empId}`,
                retries: 10
            };
            const detailsResp = await nango.get<PaylocityUser>(getConfig);
            const fullEmp = detailsResp.data;

            if (matchesEmail(fullEmp, email)) {
                foundEmployeeId = empId;
                break;
            }
        }
        if (foundEmployeeId) break;
    }

    if (!foundEmployeeId) {
        throw new nango.ActionError({
            message: `No Paylocity user found with email: ${email}`
        });
    }

    const patchBody: Record<string, any> = {
        status: {
            employeeStatus: 'T'
        }
    };

    const patchConfig: ProxyConfiguration = {
        // https://developer.paylocity.com/integrations/reference/update-employee
        endpoint: `/api/v2/companies/${companyId}/employees/${foundEmployeeId}`,
        data: patchBody,
        retries: 10
    };

    await nango.patch(patchConfig);

    return { success: true };
}
