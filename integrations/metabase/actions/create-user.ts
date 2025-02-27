import type { CreateUser, NangoAction, ProxyConfiguration, User } from '../../models';
import { createUserSchema } from '../schema.zod.js';
import type { MetabaseUser } from '../types';

export default async function runAction(nango: NangoAction, input: CreateUser) {
    nango.zodValidateInput({ zodSchema: createUserSchema, input });
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
