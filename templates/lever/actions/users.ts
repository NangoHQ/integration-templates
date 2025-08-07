import { createAction } from "nango";
import type { ProxyConfiguration } from "nango";
import { GetUsers } from "../models.js";
import { z } from "zod";

const action = createAction({
    description: "Lists all the users in your Lever account. Only active users are included by default.",
    version: "1.0.0",

    endpoint: {
        method: "GET",
        path: "/users",
        group: "Users"
    },

    input: z.void(),
    output: GetUsers,

    exec: async (nango): Promise<GetUsers> => {
        const config: ProxyConfiguration = {
            // https://hire.lever.co/developer/documentation#list-all-users
            endpoint: `/v1/users`,
            retries: 3
        };

        const resp = await nango.get(config);

        return {
            users: resp.data.data
        };
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
