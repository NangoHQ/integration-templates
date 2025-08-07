import { createAction } from "nango";
import type { LatticeUser } from '../types.js';
import { createUserSchema } from '../schema.zod.js';

import type { ProxyConfiguration } from "nango";
import { User, CreateUser } from "../models.js";

/**
 * Executes the create user action by validating input, constructing the request configuration,
 * and making the Lattice SCIM API call to create a new user.
 */
const action = createAction({
    description: "Creates a user in Lattice",
    version: "1.0.0",

    endpoint: {
        method: "POST",
        path: "/users",
        group: "Users"
    },

    input: CreateUser,
    output: User,

    exec: async (nango, input): Promise<User> => {
        const parsedInput = await nango.zodValidateInput({ zodSchema: createUserSchema, input });

        const config: ProxyConfiguration = {
            // https://developers.toriihq.com/docs/lattice-create-lattice-user
            endpoint: 'scim/v2/Users',
            data: {
                schemas: [
                    'urn:ietf:params:scim:schemas:core:2.0:User',
                    'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User',
                    'urn:ietf:params:scim:schemas:extension:lattice:attributes:1.0:User'
                ],
                name: {
                    givenName: parsedInput.data.firstName,
                    familyName: parsedInput.data.lastName
                },
                userName: parsedInput.data.email,
                active: true,
                emails: [
                    {
                        type: 'work',
                        value: parsedInput.data.email
                    }
                ]
            },
            retries: 3
        };

        const response = await nango.post<LatticeUser>(config);

        const newUser = response.data;

        const [firstName, ...lastNameParts] = (newUser?.name || '').split(' ');

        const user: User = {
            id: newUser?.id ? newUser.id.toString() : '',
            firstName: firstName || '',
            lastName: lastNameParts.join(' ') || '',
            email: parsedInput.data.email
        };

        return user;
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
