import { createAction } from 'nango';
import { toUser, createUser } from '../mappers/toUser.js';
import { oktaCreateUserSchema } from '../schema.zod.js';

import type { ProxyConfiguration } from 'nango';
import { OktaCreateUser, User } from '../models.js';

const action = createAction({
    description: 'Creates a new user in your Okta org without credentials.',
    version: '2.0.0',

    endpoint: {
        method: 'POST',
        path: '/users',
        group: 'Users'
    },

    input: OktaCreateUser,
    output: User,
    scopes: ['okta.users.manage'],

    exec: async (nango, input): Promise<User> => {
        const parsedInput = await nango.zodValidateInput({ zodSchema: oktaCreateUserSchema, input });

        const oktaCreateUser: OktaCreateUser = {
            firstName: parsedInput.data.firstName,
            lastName: parsedInput.data.lastName,
            email: parsedInput.data.email,
            login: parsedInput.data.login,
            mobilePhone: parsedInput.data.mobilePhone
        };

        const oktaGroup = createUser(oktaCreateUser);
        const config: ProxyConfiguration = {
            // https://developer.okta.com/docs/api/openapi/okta-management/management/tag/User/#tag/User/operation/createUser
            endpoint: '/api/v1/users',
            data: oktaGroup,
            retries: 3
        };

        const response = await nango.post(config);

        return toUser(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
