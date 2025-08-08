import { createAction } from 'nango';
import { toUser } from '../mappers/to-user.js';
import { perimeter81CreateUserSchema } from '../schema.zod.js';
import type { Perimeter81User } from '../types.js';

import type { ProxyConfiguration } from 'nango';
import { User, Perimeter81CreateUser } from '../models.js';

/**
 * Creates an Perimeter81 user.
 *
 * This function validates the input against the defined schema and constructs a request
 * to the Perimeter81 API to create a new user. If the input is invalid, it logs the
 * errors and throws an ActionError.
 *
 * @param {NangoAction} nango - The Nango action context, used for logging and making API requests.
 * @param {Perimeter81CreateUser} input - The input data for creating a user contact
 *
 * @returns {Promise<User>} - A promise that resolves to the created User object.
 *
 * @throws {nango.ActionError} - Throws an error if the input validation fails.
 *
 * For detailed endpoint documentation, refer to:
 * https://support.perimeter81.com/docs/post-new-member
 */
const action = createAction({
    description: 'Creates a user in Perimeter81',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/users',
        group: 'Users'
    },

    input: Perimeter81CreateUser,
    output: User,

    exec: async (nango, input): Promise<User> => {
        const parsedInput = await nango.zodValidateInput({ zodSchema: perimeter81CreateUserSchema, input });

        const { firstName, lastName, profileData = {}, ...data } = parsedInput.data;

        const config: ProxyConfiguration = {
            // https://support.perimeter81.com/docs/post-new-member
            endpoint: `/v1/users`,
            data: {
                ...data,
                inviteMessage: parsedInput.data.inviteMessage || 'Welcome to the team!',
                profileData: {
                    ...profileData,
                    firstName,
                    lastName
                }
            },
            retries: 3
        };

        const response = await nango.post<Perimeter81User>(config);

        return toUser(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
