import { createAction } from 'nango';
import { toUser } from '../mappers/to-user.js';
import { keeperCreateUserSchema } from '../schema.zod.js';
import type { KeeperUser } from '../types.js';

import type { ProxyConfiguration } from 'nango';
import { User, KeeperCreateUser } from '../models.js';

/**
 * Creates a Keeper user.
 *
 * This function validates the input against the defined schema and constructs a request
 * to the Keeper API to create a new user. If the input is invalid, it logs the
 * errors and throws an ActionError.
 *
 * @param {NangoAction} nango - The Nango action context, used for logging and making API requests.
 * @param {KeeperCreateUser} input - The input data for creating a user contact
 *
 * @returns {Promise<User>} - A promise that resolves to the created User object.
 *
 * @throws {nango.ActionError} - Throws an error if the input validation fails.
 *
 * For detailed endpoint documentation, refer to:
 * https://docs.keeper.io/en/enterprise-guide/user-and-team-provisioning/automated-provisioning-with-scim
 */
const action = createAction({
    description: 'Creates a user in Keeper',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/users',
        group: 'Users'
    },

    input: KeeperCreateUser,
    output: User,

    exec: async (nango, input): Promise<User> => {
        await nango.zodValidateInput({ zodSchema: keeperCreateUserSchema, input });

        const { firstName, lastName, email, ...data } = input;

        const config: ProxyConfiguration = {
            // https://docs.keeper.io/en/enterprise-guide/user-and-team-provisioning/automated-provisioning-with-scim
            endpoint: `/Users`,
            data: {
                schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
                userName: email,
                emails: [
                    {
                        type: 'work',
                        value: email
                    }
                ],
                name: {
                    givenName: firstName,
                    familyName: lastName
                },
                ...data
            },
            retries: 3
        };

        const response = await nango.post<KeeperUser>(config);

        return toUser(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
