import type { NangoAction, ProxyConfiguration, RampCreateUser, User } from '../../models';
import type { RampCreatedUser } from '../types';
import { rampCreateUserSchema } from '../schema.zod.js';

/**
 * Executes the create user action by validating input, constructing the request configuration,
 * and making the Ramp API call to create a new user.
 */
export default async function runAction(nango: NangoAction, input: RampCreateUser): Promise<User> {
    const parsedInput = await nango.zodValidateInput({ zodSchema: rampCreateUserSchema, input });

    const config: ProxyConfiguration = {
        // https://docs.ramp.com/developer-api/v1/api/users#post-developer-v1-users-deferred
        endpoint: '/developer/v1/users/deferred',
        data: {
            first_name: parsedInput.data.firstName,
            last_name: parsedInput.data.lastName,
            email: parsedInput.data.email,
            role: parsedInput.data.role || 'IT_ADMIN'
        },
        retries: 10
    };

    const response = await nango.post<RampCreatedUser>(config);

    const newUser = response.data;
    const user: User = {
        id: newUser.id ? newUser.id.toString() : '',
        firstName: parsedInput.data.firstName,
        lastName: parsedInput.data.lastName,
        email: parsedInput.data.email
    };

    return user;
}
