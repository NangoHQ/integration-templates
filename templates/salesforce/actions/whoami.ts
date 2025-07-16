import { createAction } from "nango";
import type { SalesForceUserInfo } from '../types.js';

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

    exec: async (nango): Promise<UserInformation> => {
        const config: ProxyConfiguration = {
            baseUrlOverride: 'https://login.salesforce.com',
            // https://help.salesforce.com/s/articleView?id=sf.remoteaccess_using_userinfo_endpoint.htm&type=5
            endpoint: '/services/oauth2/userinfo',
            retries: 3
        };

        const { data } = await nango.get<SalesForceUserInfo>(config);

        const user: UserInformation = {
            id: data.user_id,
            email: data.email
        };

        return user;
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
