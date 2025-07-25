import { createAction } from "nango";
import type { HubspotAccessTokenMetadata } from '../types.js';

import type { ProxyConfiguration } from "nango";
import { UserInformation } from "../models.js";
import { z } from "zod";

const action = createAction({
    description: "Fetch current user information",
    version: "2.0.0",

    endpoint: {
        method: "GET",
        path: "/whoami",
        group: "Users"
    },

    input: z.void(),
    output: UserInformation,

    exec: async (nango): Promise<UserInformation> => {
        const connection = await nango.getConnection();
        if (!('access_token' in connection.credentials)) {
            throw new nango.ActionError({
                message: 'Access token is missing in credentials'
            });
        }
        const config: ProxyConfiguration = {
            // https://developers.hubspot.com/docs/guides/api/app-management/oauth-tokens#retrieve-access-token-metadata
            endpoint: `/oauth/v1/access-tokens/${connection.credentials.access_token}`,
            retries: 3
        };

        const { data } = await nango.get<HubspotAccessTokenMetadata>(config);

        const user: UserInformation = {
            id: data.user_id,
            email: data.user
        };

        return user;
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
