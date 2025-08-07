import { createAction } from "nango";
import { idEntitySchema } from '../schema.zod.js';

import type { ProxyConfiguration } from "nango";
import { SuccessResponse, IdEntity } from "../models.js";

const action = createAction({
    description: "Disables a user in an organization account. User will no longer be able to access Smartsheet in any way. User's assets will continue to be owned by this user until they are transferred to another user.",
    version: "1.0.0",

    endpoint: {
        method: "POST",
        path: "/users/disable",
        group: "Users"
    },

    input: IdEntity,
    output: SuccessResponse,
    scopes: ["ADMIN_USERS"],

    exec: async (nango, input): Promise<SuccessResponse> => {
        const parsedInput = await nango.zodValidateInput({ zodSchema: idEntitySchema, input });

        const config: ProxyConfiguration = {
            // https://smartsheet.redoc.ly/tag/users/#operation/deactivate-user
            endpoint: `/2.0/users/${encodeURIComponent(parsedInput.data.id)}/deactivate`,
            retries: 3
        };

        await nango.post(config);

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
