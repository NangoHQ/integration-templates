import type { NangoAction, ProxyConfiguration, GustoCreateEmployee, GustoCreateEmployeeResponse } from '../../models.js';
import { GustoCreateEmployeeSchema } from '../schema.js';
import type { GustoEmployee, GustoCreateEmployeeRequest } from '../types.js';

export default async function runAction(nango: NangoAction, input: GustoCreateEmployee): Promise<GustoCreateEmployeeResponse> {
    const parsedInput = await nango.zodValidateInput({ zodSchema: GustoCreateEmployeeSchema, input });

    const connection = await nango.getConnection();

    const companyUuid = connection.connection_config['companyUuid'];

    if (!companyUuid) {
        throw new nango.ActionError({
            message: 'Company UUID is missing from the connection configuration'
        });
    }

    const gustoInput: GustoCreateEmployeeRequest = {
        first_name: parsedInput.data.firstName,
        last_name: parsedInput.data.lastName,
        email: parsedInput.data.email
    };

    if (parsedInput.data.dateOfBirth) {
        gustoInput.date_of_birth = parsedInput.data.dateOfBirth;
    }

    if (parsedInput.data.middleInitial) {
        gustoInput.middle_initial = parsedInput.data.middleInitial;
    }

    if (parsedInput.data.preferredFirstName) {
        gustoInput.preferred_first_name = parsedInput.data.preferredFirstName;
    }

    if (parsedInput.data.ssn) {
        gustoInput.ssn = parsedInput.data.ssn;
    }

    if (parsedInput.data.selfOnboarding) {
        gustoInput.self_onboarding = parsedInput.data.selfOnboarding;
    }

    const config: ProxyConfiguration = {
        // https://docs.gusto.com/embedded-payroll/reference/post-v1-employees
        endpoint: `/v1/companies/${companyUuid}/employees`,
        data: gustoInput,
        retries: 3
    };

    const response = await nango.post<GustoEmployee>(config);
    const { data } = response;

    const createEmployeeResponse: GustoCreateEmployeeResponse = {
        id: data.uuid,
        firstName: data.first_name,
        lastName: data.last_name,
        email: data.email
    };

    return createEmployeeResponse;
}
