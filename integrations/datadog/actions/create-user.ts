import { createAction } from 'nango';
import { createUserSchema } from '../schema.zod.js';
import type { DatadogCreateUserResponse } from '../types.js';

import type { ProxyConfiguration } from 'nango';
import { User, CreateUser } from '../models.js';

const action = createAction({
    description: 'Creates a user in Datadog.',
    version: '2.0.0',

    endpoint: {
        method: 'POST',
        path: '/users',
        group: 'Users'
    },

    input: CreateUser,
    output: User,
    scopes: ['user_access_invite'],

    exec: async (nango, input): Promise<User> => {
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
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
