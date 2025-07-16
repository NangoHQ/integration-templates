import { createAction } from "nango";
import type { GoogleUserInfoResponse } from '../types.js';

import type { ProxyConfiguration } from "nango";
import { UserInformation } from "../models.js";
import { z } from "zod";

const action = createAction({
    description: "description: Fetch current user information",
    version: "1.0.0",

    endpoint: {
        method: "GET",
        path: "/whoami",
        group: "Users"
    },

    input: z.void(),
    output: UserInformation,

    exec: async (nango): Promise<UserInformation> => {
        const config: ProxyConfiguration = {
            // https://cloud.google.com/identity-platform/docs/reference/rest/v1/UserInfo
            endpoint: '/oauth2/v1/userinfo',
            params: {
                alt: 'json'
            },
            retries: 3
        };

        const { data } = await nango.get<GoogleUserInfoResponse>(config);

        const info: UserInformation = {
            id: data.id.toString(),
            email: data.email
        };

        return info;
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
