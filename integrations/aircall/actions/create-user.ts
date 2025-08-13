import { createAction } from 'nango';
import { createUserSchema } from '../schema.zod.js';
import type { AircallUser } from '../types.js';

import type { ProxyConfiguration } from 'nango';
import { User, CreateUser } from '../models.js';

const action = createAction({
    description: 'Creates a user in Aircall.',
    version: '2.0.0',

    endpoint: {
        method: 'POST',
        path: '/users',
        group: 'Users'
    },

    input: CreateUser,
    output: User,

    exec: async (nango, input): Promise<User> => {
        await nango.zodValidateInput({ zodSchema: createUserSchema, input });

        const aInput = {
            email: input.email,
            first_name: input.firstName,
            last_name: input.lastName
        };

        const config: ProxyConfiguration = {
            // https://developer.aircall.io/api-references/#create-a-user
            endpoint: '/v1/users',
            data: aInput,
            retries: 3
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
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
