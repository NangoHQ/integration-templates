import { NangoAction, ProxyConfiguration, User } from '../models.ts';
import { DialpadCreateUser } from '../types';
import { dialpadCreateUserSchema } from '../schema.zod.ts';

/**
 * Executes the create user action by validating input, constructing the request configuration,
 * and making the Dialpad API call to create a new user.
 */
export default async function createUser(
    input: DialpadCreateUser,
    nango: NangoAction
): Promise<User> {
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
        endpoint: '/users', 
        data: {
            firstName: parsedInput.data.firstName,
            lastName: parsedInput.data.lastName,
            email: parsedInput.data.email,
            license: parsedInput.data.license,
            officeId: parsedInput.data.officeId,
            autoAssign: parsedInput.data.autoAssign
        },
        retries: 10 
    };

    const response = await nango.post<{ resource: User }>(config);

    const newUser = response.data.resource;
    const user: User = {
        id: newUser.id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email
    };

    return user;
} 