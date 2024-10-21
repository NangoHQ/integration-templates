import type { NangoAction, ProxyConfiguration, User, IntercomCreateUser } from '../../models';
import { toUser } from '../mappers/to-user.js';
import { intercomCreateUserSchema } from '../schema.zod.js';
import type { IntercomContact } from '../types';

export default async function runAction(nango: NangoAction, input: IntercomCreateUser): Promise<User> {
    const parsedInput = intercomCreateUserSchema.safeParse(input);

    if (!parsedInput.success) {
        for (const error of parsedInput.error.errors) {
            await nango.log(`Invalid input provided to create a user: ${error.message} at path ${error.path.join('.')}`, { level: 'error' });
        }

        throw new nango.ActionError({
            message: 'Invalid input provided to create a user'
        });
    }

    const { firstName, lastName, ...userInput } = parsedInput.data;

    const config: ProxyConfiguration = {
        // https://developers.intercom.com/docs/references/1.1/rest-api/users/create-or-update-user
        endpoint: `/contacts`,
        data: {
            ...userInput,
            role: 'user',
            name: `${firstName} ${lastName}`
        },
        retries: 10
    };

    const response = await nango.post<IntercomContact>(config);

    return toUser(response.data);
}
