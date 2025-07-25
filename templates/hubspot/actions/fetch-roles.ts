import { createAction } from "nango";
import type { ProxyConfiguration } from "nango";
import { RoleResponse } from "../models.js";
import { z } from "zod";

const action = createAction({
    description: "Fetch the roles on an account. Requires an enterprise account.",
    version: "1.0.0",

    endpoint: {
        method: "GET",
        path: "/roles",
        group: "Roles"
    },

    input: z.void(),
    output: RoleResponse,

    scopes: [
        "oauth",
        "settings.users.read (standard scope)",
        "crm.objects.users.read (granular scope)"
    ],

    exec: async (nango): Promise<RoleResponse> => {
        const config: ProxyConfiguration = {
            // https://developers.hubspot.com/docs/api/settings/user-provisioning
            endpoint: `/settings/v3/users/roles`,
            retries: 3
        };
        const response = await nango.get(config);

        return response.data;
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
