import { createAction } from "nango";
import { toUser } from '../mappers/to-user.js';
import { harvestCreateUserSchema } from '../schema.zod.js';
import type { HarvestUser } from '../types.js';

import type { ProxyConfiguration } from "nango";
import { User, HarvestCreateUser } from "../models.js";

/**
 * Creates a Haverst user.
 *
 * This function validates the input against the defined schema and constructs a request
 * to the Harvest API to create a new user contact. If the input is invalid, it logs the
 * errors and throws an ActionError.
 *
 * @param {NangoAction} nango - The Nango action context, used for logging and making API requests.
 * @param {HaverstCreateUser} input - The input data for creating a user contact
 *
 * @returns {Promise<User>} - A promise that resolves to the created User object.
 *
 * @throws {nango.ActionError} - Throws an error if the input validation fails.
 *
 * For detailed endpoint documentation, refer to:
 * https://help.getharvest.com/api-v2/users-api/users/users/#create-a-user
 */
const action = createAction({
    description: "Creates a user in Harvest",
    version: "1.0.0",

    endpoint: {
        method: "POST",
        path: "/users",
        group: "Users"
    },

    input: HarvestCreateUser,
    output: User,
    scopes: ["administrator", "manager"],

    exec: async (nango, input): Promise<User> => {
        const parsedInput = await nango.zodValidateInput({ zodSchema: harvestCreateUserSchema, input });

        const config: ProxyConfiguration = {
            // https://help.getharvest.com/api-v2/users-api/users/users/#create-a-user
            endpoint: `/v2/users`,
            data: parsedInput.data,
            retries: 3
        };

        const response = await nango.post<HarvestUser>(config);
        const { data } = response;

        return toUser(data);
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
