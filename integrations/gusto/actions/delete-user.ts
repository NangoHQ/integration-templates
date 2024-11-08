import type { NangoAction, ProxyConfiguration, SuccessResponse, GustoDeleteUser } from '../../models';
import type { EmployeeResponse, GustoDeleteEmployee } from '../types';
import { gustoDeleteUserSchema } from '../schema.zod';


export default async function runAction(nango: NangoAction, input: GustoDeleteUser): Promise<SuccessResponse> {

    const parsedInput = gustoDeleteUserSchema.safeParse(input);

    if (!parsedInput.success) {
        throw new nango.ActionError({
            message: 'Invalid input provided for deleting a user',
            details: parsedInput.error.errors
        });
    }
    
    const connection = await nango.getConnection();

    const companyUuid = connection.connection_config['companyUuid'];

    if (!companyUuid) {
        throw new nango.ActionError({
            message: 'Company UUID is missing from the connection configuration'
        });
    }

    const userId = await findUserByEmail(nango, companyUuid, input.email);

    const gustoInput: GustoDeleteEmployee = {
        effective_date: input.effectiveDate ? new Date(input.effectiveDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
    };

    if (input.runTerminationPayroll) {
        gustoInput.run_termination_payroll = input.runTerminationPayroll;
    }

    const deleteUserConfig: ProxyConfiguration = {
        // https://docs.gusto.com/embedded-payroll/reference/post-v1-employees-employee_id-terminations
        endpoint: `/v1/employees/${userId}/terminations`,
        data: gustoInput,
        retries: 10
    };

    await nango.post(deleteUserConfig);

    return {
        success: true
    };

}


/**
 * Finds a Gusto user by their email address within a company
 * @param nango - The Nango action instance
 * @param companyUuid - UUID of the company to search in
 * @param email - Email address of the user to find
 * @returns The UUID of the matching user
 * @throws ActionError if no user is found with the given email
 */
async function findUserByEmail(nango: NangoAction, companyUuid: string, email: string): Promise<string> {
    const getUserConfig: ProxyConfiguration = {
        // https://docs.gusto.com/embedded-payroll/reference/get-v1-companies-company_id-employees
        endpoint: `/v1/companies/${companyUuid}/employees`,
        paginate: {
            type: 'offset',
            offset_name_in_request: 'page',
            response_path: '',
            limit_name_in_request: 'per'
        }
    };

    for await (const gUsers of nango.paginate<EmployeeResponse>(getUserConfig)) {
        const matchingUser = gUsers.find((gUser: EmployeeResponse) => gUser.email === email);
        if (matchingUser) {
            return matchingUser.uuid;
        }
    }

    throw new nango.ActionError({
        message: `No user found with email ${email}`
    });
}