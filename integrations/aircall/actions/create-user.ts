import type { NangoAction, ProxyConfiguration, CreateUser, User } from '../../models';
import { createUserSchema } from '../schema.zod.js';
import type { AircallUser } from '../types';

export default async function runAction(nango: NangoAction, input: CreateUser): Promise<User> {
    nango.zodValidate({ zodSchema: createUserSchema, input });

    const aInput = {
        email: input.email,
        first_name: input.firstName,
        last_name: input.lastName
    };

    const config: ProxyConfiguration = {
        // https://developer.aircall.io/api-references/#create-a-user
        endpoint: '/v1/users',
        data: aInput,
        retries: 10
    };

    const response = await nango.post<{ user: AircallUser }>(config);

    const { data } = response;

    const [firstName, lastName] = data.user.name.split(' ');
    const user: User = {
        id: data.user.id.toString(),
        email: data.user.email,
        firstName: firstName || '',
        lastName: lastName || ''
    };

    return user;
}
