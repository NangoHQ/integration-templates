import { createAction } from "nango";
import type { ProxyConfiguration } from "nango";
import { SuccessResponse, IdEntity } from "../../models.js";

const action = createAction({
    description: "Deletes a user in Aircall",
    version: "1.0.0",

    endpoint: {
        method: "DELETE",
        path: "/users",
        group: "Users"
    },

    input: IdEntity,
    output: SuccessResponse,

    exec: async (nango, input): Promise<SuccessResponse> => {
        if (!input || !input.id) {
            throw new nango.ActionError({
                message: 'Id is required'
            });
        }

        const config: ProxyConfiguration = {
            // https://developer.aircall.io/api-references/#delete-a-user
            endpoint: `/v1/users/${input.id}`,
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
