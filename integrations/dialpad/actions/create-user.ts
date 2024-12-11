import type { NangoAction, ProxyConfiguration, DialpadCreateUser, User } from '../../models';
import type { DialpadUser } from '../types';
import { dialpadCreateUserSchema } from '../schema.zod.js';

/**
 * Executes the create user action by validating input, constructing the request configuration,
 * and making the Dialpad API call to create a new user.
 */
export default async function createUser(input: DialpadCreateUser, nango: NangoAction): Promise<User> {
    const parsedInput = dialpadCreateUserSchema.safeParse(input);

    if (!parsedInput.success) {
        for (const error of parsedInput.error.errors) {
            await nango.log(`Invalid input provided to create a user: ${error.message} at path ${error.path.join('.')}`, { level: 'error' });
        }

        throw new nango.ActionError({
            message: 'Invalid input provided to create a user'
        });
    }

    const config: ProxyConfiguration = {
        // https://developers.dialpad.com/reference/userscreate
        endpoint: '/api/v2/users',
        data: {
            first_name: parsedInput.data.firstName,
            last_name: parsedInput.data.lastName,
            email: parsedInput.data.email,
            license: parsedInput.data.license || 'talk',
            office_id: parsedInput.data.officeId ?? null,
            ...(parsedInput.data.autoAssign !== undefined && { auto_assign: parsedInput.data.autoAssign })
        },
        retries: 10
    };

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
