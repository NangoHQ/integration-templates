import type { CreateUser, NangoAction, ProxyConfiguration, User } from '../../models';
import { createUserSchema } from '../schema.zod.js';
import type { MetabaseUser } from '../types';

export default async function runAction(nango: NangoAction, input: CreateUser) {
    const parsedInput = await nango.zodValidateInput({ zodSchema: createUserSchema, input });

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
        id: data.id.toString(),
        firstName: data.first_name,
        lastName: data.last_name,
        email: data.email
    };

    return user;
}
