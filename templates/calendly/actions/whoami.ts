import { createAction } from "nango";
import type { CalendlyCurrentUser } from '../types.js';

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
        const config: ProxyConfiguration = {
            // https://developer.calendly.com/api-docs/005832c83aeae-get-current-user
            endpoint: '/users/me',
            retries: 3
        };

        const { data } = await nango.get<{ resource: CalendlyCurrentUser }>(config);

        const id: string | undefined = data.resource.uri.split('/').pop();

        if (!id) {
            throw new nango.ActionError({
                message: 'Unable to find user id',
                data
            });
        }

        const user: UserInformation = {
            id,
            email: data.resource.email
        };

        return user;
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
