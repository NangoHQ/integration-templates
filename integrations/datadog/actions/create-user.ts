import type { NangoAction, ProxyConfiguration, CreateUser, User } from '../../models';
import { createUserSchema } from '../schema.zod.js';
import type { DatadogCreateUserResponse } from '../types';

export default async function runAction(nango: NangoAction, input: CreateUser): Promise<User> {
    nango.zodValidateInput({ zodSchema: createUserSchema, input });

    const config: ProxyConfiguration = {
        // https://docs.datadoghq.com/api/latest/users/?code-lang=typescript#create-a-user
        endpoint: '/v2/users',
        data: dInput,
        retries: 10
    };

    const response = await nango.post<DatadogCreateUserResponse>(config);

    const { data } = response.data;

    const user: User = {
        id: data.id,
        email: data.attributes.email,
        firstName: input.firstName,
        lastName: input.lastName
    };

    return user;
}
