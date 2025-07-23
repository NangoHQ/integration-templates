import { createAction } from "nango";
import { createUserSchema } from '../schema.zod.js';
import type { MetabaseUser } from '../types.js';

import type { ProxyConfiguration } from "nango";
import { User, CreateUser } from "../models.js";

const action = createAction({
    description: "Creates a user in Metabase.",
    version: "0.0.1",

    endpoint: {
        method: "POST",
        path: "/users",
        group: "Users"
    },

    input: CreateUser,
    output: User,

    exec: async (nango, input): Promise<User> => {
        const parsedInput = await nango.zodValidateInput({ zodSchema: createUserSchema, input });

        const metabaseInput = {
            first_name: parsedInput.data.firstName,
            last_name: parsedInput.data.lastName,
            email: parsedInput.data.email
        };
        const config: ProxyConfiguration = {
            // https://www.metabase.com/docs/latest/api/user
            endpoint: '/api/user',
            data: metabaseInput,
            retries: 3
        };

        const response = await nango.post<MetabaseUser>(config);

        const { data } = response;

        const user: User = {
            id: data.id.toString(),
            firstName: data.first_name,
            lastName: data.last_name,
            email: data.email
        };

        return user;
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
