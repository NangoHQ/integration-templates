import type { NangoAction, ProxyConfiguration, DialpadCreateUser, User } from '../../models';
import type { DialpadUser } from '../types';
import { dialpadCreateUserSchema } from '../schema.zod.js';

/**
 * Executes the create user action by validating input, constructing the request configuration,
 * and making the Dialpad API call to create a new user.
 */
export default async function createUser(input: DialpadCreateUser, nango: NangoAction): Promise<User> {
    nango.zodValidateInput({ zodSchema: dialpadCreateUserSchema, input });

    const response = await nango.post<DialpadUser>(config);

    const newUser = response.data;
    const user: User = {
        id: newUser.id ? newUser.id.toString() : '',
        firstName: newUser.first_name || '',
        lastName: newUser.last_name || '',
        email: parsedInput.data.email
    };

    return user;
}
