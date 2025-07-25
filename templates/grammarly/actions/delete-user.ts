import { createAction } from "nango";
import { emailEntitySchema } from '../schema.zod.js';

import type { ProxyConfiguration } from "nango";
import { SuccessResponse, EmailEntity } from "../models.js";

const action = createAction({
    description: "Deletes a user in Grammarly",
    version: "1.0.0",

    endpoint: {
        method: "DELETE",
        path: "/users",
        group: "Users"
    },

    input: EmailEntity,
    output: SuccessResponse,

    exec: async (nango, input): Promise<SuccessResponse> => {
        await nango.zodValidateInput({ zodSchema: emailEntitySchema, input });

        const config: ProxyConfiguration = {
            // https://developer.grammarly.com/license-management-api.html#remove-the-user-from-the-institution
            endpoint: `/users/${input.email}`,
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
