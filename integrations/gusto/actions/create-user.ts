import type { NangoAction, ProxyConfiguration, GustoCreateUser, User } from '../../models';
import { GustoCreateUserSchema } from '../schema.js';
import type { GustoEmployee, GustoCreateEmployee } from '../types';

export default async function runAction(nango: NangoAction, input: GustoCreateUser): Promise<User> {
    const parsedInput = GustoCreateUserSchema.safeParse(input);

    if (!parsedInput.success) {
        for (const error of parsedInput.error.errors) {
            await nango.log(`Invalid input provided to create a user: ${error.message} at path ${error.path.join('.')}`, { level: 'error' });
        }
        throw new nango.ActionError({
            message: 'Invalid input provided to create a user'
        });
    }

    const connection = await nango.getConnection();

    const companyUuid = connection.connection_config['companyUuid'];

    if (!companyUuid) {
        throw new nango.ActionError({
            message: 'Company UUID is missing from the connection configuration'
        });
    }

    const gustoInput: GustoCreateEmployee = {
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
        retries: 10
    };

    const response = await nango.post<GustoEmployee>(config);
    const { data } = response;

    const user: User = {
        id: data.uuid,
        firstName: data.first_name,
        lastName: data.last_name,
        email: data.email
    };

    return user;
}
