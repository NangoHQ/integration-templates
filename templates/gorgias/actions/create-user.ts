import { createAction } from "nango";
import { gorgiasCreateUserSchema } from '../schema.zod.js';
import type { GorgiasCreateUserReq, GorgiasUserResponse } from '../types.js';

import type { ProxyConfiguration } from "nango";
import { GorgiasUser, GorgiasCreateUser } from "../models.js";

/**
 * Creates a new user in Gorgias.
 *
 * @param {NangoAction} nango - The Nango action instance.
 * @param {GorgiasCreateUser} input - The input data for creating a user.
 * @returns {Promise<GorgiasUser>} - A promise that resolves to the created Gorgias user.
 * @throws {nango.ActionError} - Throws an error if the input validation fails.
 */
const action = createAction({
    description: "Creates a new user with a role in Gorgias. Defaults to agent if a role is not provided",
    version: "1.0.1",

    endpoint: {
        method: "POST",
        path: "/users",
        group: "Users"
    },

    input: GorgiasCreateUser,
    output: GorgiasUser,
    scopes: ["users:write"],

    exec: async (nango, input): Promise<GorgiasUser> => {
        await nango.zodValidateInput({ zodSchema: gorgiasCreateUserSchema, input });

        const data: GorgiasCreateUserReq = {
            name: `${input.firstName} ${input.lastName}`,
            email: input.email.toLowerCase(),
            role: {
                name: input.role || 'agent'
            }
        };

        const config: ProxyConfiguration = {
            // https://developers.gorgias.com/reference/create-user
            endpoint: '/api/users',
            retries: 3,
            data
        };

        const response = await nango.post<GorgiasUserResponse>(config);

        const { data: dataResponse } = response;

        const user: GorgiasUser = {
            id: dataResponse.id.toString(),
            firstName: dataResponse.name.split(' ')[0] || '',
            lastName: dataResponse.name.split(' ')[1] || '',
            email: dataResponse.email
        };

        return user;
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
