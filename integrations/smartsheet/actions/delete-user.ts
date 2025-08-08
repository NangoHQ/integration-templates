import { createAction } from "nango";
import { idEntitySchema } from '../schema.zod.js';

import type { ProxyConfiguration } from "nango";
import { SuccessResponse, IdEntity } from "../models.js";

const action = createAction({
    description: "Deletes a user from Smartsheet. User is transitioned to a free collaborator with read-only access to owned reports, sheets, Sights, workspaces, and any shared templates (unless those are optionally transferred to another user).",
    version: "1.0.0",

    endpoint: {
        method: "DELETE",
        path: "/users",
        group: "Users"
    },

    input: IdEntity,
    output: SuccessResponse,
    scopes: ["ADMIN_USERS"],

    exec: async (nango, input): Promise<SuccessResponse> => {
        const parsedInput = await nango.zodValidateInput({ zodSchema: idEntitySchema, input });

        const config: ProxyConfiguration = {
            // https://smartsheet.redoc.ly/tag/users/#operation/remove-user
            endpoint: `/2.0/users/${encodeURIComponent(parsedInput.data.id)}`,
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
