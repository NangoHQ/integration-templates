import { createAction } from "nango";
import type { WhoAmIResponse } from '../types.js';

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
    scopes: ["Read admins"],

    exec: async (nango): Promise<UserInformation> => {
        const config: ProxyConfiguration = {
            // https://developers.intercom.com/docs/references/1.1/rest-api/admins/viewing-the-current-admin
            endpoint: 'me',
            retries: 3
        };

        const { data } = await nango.get<WhoAmIResponse>(config);

        const user: UserInformation = {
            id: data.id,
            email: data.email
        };

        return user;
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
