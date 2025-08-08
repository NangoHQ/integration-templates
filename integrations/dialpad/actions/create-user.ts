import { createAction } from 'nango';
import type { DialpadUser } from '../types.js';
import { dialpadCreateUserSchema } from '../schema.zod.js';

import type { ProxyConfiguration } from 'nango';
import { User, DialpadCreateUser } from '../models.js';

/**
 * Executes the create user action by validating input, constructing the request configuration,
 * and making the Dialpad API call to create a new user.
 */
const action = createAction({
    description: 'Creates a user in Dialpad',
    version: '2.0.0',

    endpoint: {
        method: 'POST',
        path: '/users',
        group: 'Users'
    },

    input: DialpadCreateUser,
    output: User,

    exec: async (nango, input): Promise<User> => {
        await nango.zodValidateInput({ zodSchema: dialpadCreateUserSchema, input });

        const config: ProxyConfiguration = {
            // https://developers.dialpad.com/reference/userscreate
            endpoint: '/api/v2/users',
            data: {
                first_name: input.firstName,
                last_name: input.lastName,
                email: input.email,
                license: input.license || 'talk',
                office_id: input.officeId ?? null,
                ...(input.autoAssign !== undefined && { auto_assign: input.autoAssign })
            },
            retries: 3
        };

        const response = await nango.post<DialpadUser>(config);

        const newUser = response.data;
        const user: User = {
            id: newUser.id ? newUser.id.toString() : '',
            firstName: newUser.first_name || '',
            lastName: newUser.last_name || '',
            email: input.email
        };

        return user;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
