import { createAction } from "nango";
import type { SmartsheetCreatedUser } from '../types.js';
import { createUserSchema } from '../schema.zod.js';

import type { ProxyConfiguration } from "nango";
import { User, CreateUser } from "../models.js";

/**
 * Executes the create user action by validating input, constructing the request configuration,
 * and making the Smartsheet API call to create a new user.
 */
const action = createAction({
    description: "Creates a user in Smartsheet",
    version: "0.0.1",

    endpoint: {
        method: "POST",
        path: "/users",
        group: "Users"
    },

    input: CreateUser,
    output: User,
    scopes: ["ADMIN_USERS"],

    exec: async (nango, input): Promise<User> => {
        const parsedInput = await nango.zodValidateInput({ zodSchema: createUserSchema, input });

        const config: ProxyConfiguration = {
            // https://smartsheet.redoc.ly/tag/users/#operation/add-user
            endpoint: '/2.0/users',
            data: {
                admin: false,
                licensedSheetCreator: false,
                firstName: parsedInput.data.firstName,
                lastName: parsedInput.data.lastName,
                email: parsedInput.data.email
            },
            retries: 3
        };

        const response = await nango.post<SmartsheetCreatedUser>(config);

        const newUser = response.data;
        const user: User = {
            id: newUser.result.id ? newUser.result.id.toString() : '',
            firstName: parsedInput.data.firstName,
            lastName: parsedInput.data.lastName,
            email: parsedInput.data.email
        };

        return user;
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
