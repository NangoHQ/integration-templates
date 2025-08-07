import { createAction } from "nango";
import type { ProxyConfiguration } from "nango";
import { ChangedRoleResponse, UserRoleInput } from "../models.js";

const action = createAction({
    description: "Change a user role. Requires an enterprise account.",
    version: "1.0.0",

    endpoint: {
        method: "PUT",
        path: "/roles",
        group: "Roles"
    },

    input: UserRoleInput,
    output: ChangedRoleResponse,

    scopes: [
        "oauth",
        "settings.users.write (standard scope)",
        "crm.objects.users.write (granular scope)"
    ],

    exec: async (nango, input): Promise<ChangedRoleResponse> => {
        if (!input.id) {
            throw new nango.ActionError({
                message: 'Id is required'
            });
        }

        const { id, ...data } = input;

        const config: ProxyConfiguration = {
            // https://developers.hubspot.com/docs/api/settings/user-provisioning
            endpoint: `/settings/v3/users/${input.id}`,
            data,
            retries: 3
        };
        const response = await nango.put(config);

        return response.data;
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
