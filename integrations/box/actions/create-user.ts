import { createAction } from 'nango';
import { boxCreateUserSchema } from '../schema.zod.js';
import type { BoxUser } from '../types.js';

import type { ProxyConfiguration } from 'nango';
import { User, BoxCreateUser } from '../models.js';

/**
 * Executes the create user action by validating input, constructing the request configuration,
 * and making the API call to create a new user.
 */
const action = createAction({
    description: 'Creates a user in Box. Requires an enterprise account.',
    version: '2.0.0',

    endpoint: {
        method: 'POST',
        path: '/users',
        group: 'Users'
    },

    input: BoxCreateUser,
    output: User,

    exec: async (nango, input): Promise<User> => {
        await nango.zodValidateInput({ zodSchema: boxCreateUserSchema, input });

        const config: ProxyConfiguration = {
            // https://developer.box.com/reference/post-users/
            endpoint: '/2.0/users',
            data: {
                name: `${input.firstName} ${input.lastName}`,
                login: input.email
            },
            retries: 3
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
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
