import type { NangoAction, ProxyConfiguration, BoxCreateUser, User } from '../../models';
import { boxCreateUserSchema } from '../schema.zod.js';
import type { BoxUser } from '../types';

/**
 * Executes the create user action by validating input, constructing the request configuration,
 * and making the API call to create a new user.
 */
export default async function runAction(nango: NangoAction, input: BoxCreateUser): Promise<User> {
    const parsedInput = boxCreateUserSchema.safeParse(input);

    if (!parsedInput.success) {
        for (const error of parsedInput.error.errors) {
            await nango.log(`Invalid input provided to create a user: ${error.message} at path ${error.path.join('.')}`, { level: 'error' });
        }
        throw new nango.ActionError({
            message: 'Invalid input provided to create a user'
        });
    }

    const config: ProxyConfiguration = {
        // https://developer.box.com/reference/post-users/
        endpoint: `/2.0/users`,
        data: input,
        retries: 10
    };

    const response = await nango.post<BoxUser>(config);
    const { data } = response;

    const [firstName, lastName] = data.name.split(' ');

    const user: User = {
        id: data.id,
        firstName: firstName || '',
        lastName: lastName || '',
        email: data.login
    };

    return user;
}
