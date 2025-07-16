import { createAction } from "nango";
import type { MetabaseUser } from '../types.js';

import type { ProxyConfiguration } from "nango";
import { User, IdEntity } from "../models.js";

const action = createAction({
    description: "Fetches details of a specific user by ID.",
    version: "0.0.1",

    endpoint: {
        method: "GET",
        path: "/users/single",
        group: "Users"
    },

    input: IdEntity,
    output: User,

    exec: async (nango, input): Promise<User> => {
        if (input.id <= 0) {
            throw new Error('User ID must be an integer greater than zero.');
        }

        const config: ProxyConfiguration = {
            // https://www.metabase.com/docs/latest/api/user#get-apiuserid
            endpoint: `/api/user/${input.id}`,
            retries: 3
        };

        const response = await nango.get<MetabaseUser>(config);

        const user: User = {
            id: response.data.id,
            firstName: response.data.first_name,
            lastName: response.data.last_name,
            email: response.data.email,
            active: response.data.is_active
        };

        return user;
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
