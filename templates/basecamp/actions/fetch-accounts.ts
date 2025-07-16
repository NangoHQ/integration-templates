import { createAction } from "nango";
import type { BasecampAuthorizationResponse } from '../types.js';

import type { ProxyConfiguration } from "nango";
import { UserInformation } from "../models.js";
import { z } from "zod";

const action = createAction({
    description: "Fetch account list and user information from Basecamp",
    version: "0.0.1",

    endpoint: {
        method: "GET",
        path: "/accounts",
        group: "Accounts"
    },

    input: z.void(),
    output: UserInformation,

    exec: async (nango): Promise<UserInformation> => {
        const config: ProxyConfiguration = {
            baseUrlOverride: 'https://launchpad.37signals.com',
            // https://github.com/basecamp/api/blob/master/sections/authentication.md#get-authorization
            endpoint: '/authorization.json',
            retries: 3
        };

        const { data } = await nango.get<BasecampAuthorizationResponse>(config);
        const { identity, accounts } = data;

        return {
            identity: {
                id: identity.id,
                email: identity.email_address,
                firstName: identity.first_name,
                lastName: identity.last_name
            },
            accounts
        };
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
