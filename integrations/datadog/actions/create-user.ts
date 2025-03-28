import type { NangoAction, ProxyConfiguration, CreateUser, User } from '../../models';
import { createUserSchema } from '../schema.zod.js';
import type { DatadogCreateUserResponse } from '../types';

export default async function runAction(nango: NangoAction, input: CreateUser): Promise<User> {
    await nango.zodValidateInput({ zodSchema: createUserSchema, input });

    const dInput = {
        data: {
            attributes: {
                email: input.email,
                name: `${input.firstName} ${input.lastName}`
            },
            type: 'users'
        }
    };

    const config: ProxyConfiguration = {
        // https://docs.datadoghq.com/api/latest/users/?code-lang=typescript#create-a-user
        endpoint: '/v2/users',
        data: dInput,
        retries: 3
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
