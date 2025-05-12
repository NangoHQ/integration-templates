import type { NangoAction, ProxyConfiguration, GustoUpdateEmployee, GustoUpdateEmployeeResponse } from '../../models.js';
import { GustoUpdateEmployeeSchema } from '../schema.js';
import type { GustoEmployee, GustoUpdateEmployeeRequest } from '../types.js';

export default async function runAction(nango: NangoAction, input: GustoUpdateEmployee): Promise<GustoUpdateEmployeeResponse> {
    const parsedInput = await nango.zodValidateInput({ zodSchema: GustoUpdateEmployeeSchema, input });

    const employeeId = parsedInput.data.id;

    const gustoInput: GustoUpdateEmployeeRequest = {
        version: parsedInput.data.version
    };

    if (parsedInput.data.firstName) {
        gustoInput.first_name = parsedInput.data.firstName;
    }

    if (parsedInput.data.lastName) {
        gustoInput.last_name = parsedInput.data.lastName;
    }

    if (parsedInput.data.email) {
        gustoInput.email = parsedInput.data.email;
    }

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

    if (parsedInput.data.twoPercentShareholder) {
        gustoInput.two_percent_shareholder = parsedInput.data.twoPercentShareholder;
    }

    const config: ProxyConfiguration = {
        // https://docs.gusto.com/embedded-payroll/reference/post-v1-employees
        endpoint: `/v1/employees/${employeeId}`,
        data: gustoInput,
        retries: 3
    };

    const response = await nango.put<GustoEmployee>(config);
    const { data } = response;

    const createEmployeeResponse: GustoUpdateEmployeeResponse = {
        id: data.uuid,
        firstName: data.first_name,
        lastName: data.last_name,
        email: data.email
    };

    return createEmployeeResponse;
}
