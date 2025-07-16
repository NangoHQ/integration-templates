import { createAction } from "nango";
import type { ZoomUser } from '../types.js';

import type { ProxyConfiguration } from "nango";
import { UserInformation } from "../models.js";
import { z } from "zod";

const action = createAction({
    description: "Fetch current user information",
    version: "0.0.1",

    endpoint: {
        method: "GET",
        path: "/whoami",
        group: "Users"
    },

    input: z.void(),
    output: UserInformation,
    scopes: ["user:read:user"],

    exec: async (nango): Promise<UserInformation> => {
        const config: ProxyConfiguration = {
            // https://developers.zoom.us/docs/api/users/#tag/users/GET/users/{userId}
            endpoint: '/users/me',
            retries: 3
        };

        const { data } = await nango.get<ZoomUser>(config);

        const user: UserInformation = {
            id: data.id,
            email: data.email
        };

        return user;
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
