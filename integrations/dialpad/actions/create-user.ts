import type { NangoAction, ProxyConfiguration, DialpadCreateUser, User } from '../../models';
import type { DialpadUser } from '../types';
import { dialpadCreateUserSchema } from '../schema.zod.js';

/**
 * Executes the create user action by validating input, constructing the request configuration,
 * and making the Dialpad API call to create a new user.
 */
export default async function createUser(input: DialpadCreateUser, nango: NangoAction): Promise<User> {
    await nango.zodValidateInput({ zodSchema: dialpadCreateUserSchema, input });

    const config: ProxyConfiguration = {
        // https://developers.dialpad.com/reference/userscreate
        endpoint: '/api/v2/users',
        data: {
            first_name: input.firstName,
            last_name: input.lastName,
            email: input.email,
            license: input.license || 'talk',
            office_id: input.officeId ?? null,
            ...(input.autoAssign !== undefined && { auto_assign: input.autoAssign })
        },
        retries: 10
    };

    const response = await nango.post<DialpadUser>(config);

    const newUser = response.data;
    const user: User = {
        id: newUser.id ? newUser.id.toString() : '',
        firstName: newUser.first_name || '',
        lastName: newUser.last_name || '',
        email: input.email
    };

    return user;
}
