import type { NangoAction, ProxyConfiguration, RampCreateUser, User } from '../../models';
import type { RampCreatedUser } from '../types';
import { rampCreateUserSchema } from '../schema.zod.js';

/**
 * Executes the create user action by validating input, constructing the request configuration,
 * and making the Ramp API call to create a new user.
 */
export default async function runAction(nango: NangoAction, input: RampCreateUser): Promise<User> {
    nango.zodValidate({ zodSchema: rampCreateUserSchema, input });

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
