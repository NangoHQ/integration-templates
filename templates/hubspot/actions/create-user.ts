import { createAction } from "nango";
import type { ProxyConfiguration } from "nango";
import { CreatedUser, CreateUser } from "../models.js";

const action = createAction({
    description: "Creates a single user in Hubspot",
    version: "1.0.0",

    endpoint: {
        method: "POST",
        path: "/users",
        group: "Users"
    },

    input: CreateUser,
    output: CreatedUser,

    scopes: [
        "oauth",
        "settings.users.write (standard scope)",
        "crm.objects.users.write (granular)"
    ],

    exec: async (nango, input): Promise<CreatedUser> => {
        if (!input.email) {
            throw new nango.ActionError({
                message: 'Email is required'
            });
        }

        const config: ProxyConfiguration = {
            // https://developers.hubspot.com/docs/api/settings/user-provisioning
            endpoint: `/settings/v3/users`,
            data: input,
            retries: 3
        };
        const response = await nango.post(config);

        return response.data;
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
