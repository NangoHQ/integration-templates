import { createAction } from 'nango';
import type { RampCreatedUser } from '../types.js';
import { rampCreateUserSchema } from '../schema.zod.js';

import type { ProxyConfiguration } from 'nango';
import { User, RampCreateUser } from '../models.js';

/**
 * Executes the create user action by validating input, constructing the request configuration,
 * and making the Ramp API call to create a new user.
 */
const action = createAction({
    description: 'Creates a user in Ramp',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/users',
        group: 'Users'
    },

    input: RampCreateUser,
    output: User,
    scopes: ['users:write'],

    exec: async (nango, input): Promise<User> => {
        const parsedInput = await nango.zodValidateInput({ zodSchema: rampCreateUserSchema, input });

        const config: ProxyConfiguration = {
            // https://docs.ramp.com/developer-api/v1/api/users#post-developer-v1-users-deferred
            endpoint: '/developer/v1/users/deferred',
            data: {
                first_name: parsedInput.data.firstName,
                last_name: parsedInput.data.lastName,
                email: parsedInput.data.email,
                role: parsedInput.data.role || 'IT_ADMIN'
            },
            retries: 3
        };

        const response = await nango.post<RampCreatedUser>(config);

        const newUser = response.data;
        const user: User = {
            id: newUser.id ? newUser.id.toString() : '',
            firstName: parsedInput.data.firstName,
            lastName: parsedInput.data.lastName,
            email: parsedInput.data.email
        };

        return user;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
