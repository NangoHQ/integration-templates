import { createAction } from "nango";
import type { ProxyConfiguration } from "nango";
import { SuccessResponse, IdEntity } from "../models.js";

const action = createAction({
    description: "Deletes a user in Zoom. Requires Pro account or higher",
    version: "0.0.1",

    endpoint: {
        method: "DELETE",
        path: "/users",
        group: "Users"
    },

    input: IdEntity,
    output: SuccessResponse,
    scopes: ["user:write", "user:write:admin"],

    exec: async (nango, input): Promise<SuccessResponse> => {
        if (!input.id) {
            throw new nango.ActionError({
                message: 'Id is required to delete a user'
            });
        }

        const config: ProxyConfiguration = {
            // https://developers.zoom.us/docs/api/rest/reference/user/methods/#operation/userDelete
            endpoint: `/users/${input.id}`,
            retries: 3
        };

        await nango.delete(config);

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
