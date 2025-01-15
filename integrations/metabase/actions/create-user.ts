import type { CreateUser, NangoAction, ProxyConfiguration, User } from '../../models';
import { createUserSchema } from '../schema.zod.js';
import type { MetabaseUser } from '../types';

export default async function runAction(nango: NangoAction, input: CreateUser) {
    const parsedInput = createUserSchema.safeParse(input);

    if (!parsedInput.success) {
        for (const error of parsedInput.error.errors) {
            await nango.log(`Invalid input provided to create a user: ${error.message} at path ${error.path.join('.')}`, { level: 'error' });
        }
        throw new nango.ActionError({
            message: 'Invalid input provided to create a user'
        });
    }

    const metabaseInput = {
        first_name: parsedInput.data.firstName,
        last_name: parsedInput.data.lastName,
        email: parsedInput.data.email
    };
    const config: ProxyConfiguration = {
        // https://www.metabase.com/docs/latest/api/user
        endpoint: '/api/user',
        data: metabaseInput,
        retries: 10
    };

    const response = await nango.post<MetabaseUser>(config);

    const { data } = response;

    const user: User = {
        id: data.id,
        firstName: data.first_name,
        lastName: data.last_name,
        email: data.email
    };

    return user;
}
