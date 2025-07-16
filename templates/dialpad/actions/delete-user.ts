import { createAction } from "nango";
import { idEntitySchema } from '../schema.zod.js';

import type { ProxyConfiguration } from "nango";
import { SuccessResponse, IdEntity } from "../models.js";

const action = createAction({
    description: "Deletes a user in Dialpad by email",
    version: "1.0.0",

    endpoint: {
        method: "DELETE",
        path: "/users/email",
        group: "Users"
    },

    input: IdEntity,
    output: SuccessResponse,

    exec: async (nango, input): Promise<SuccessResponse> => {
        const parsedInput = await nango.zodValidateInput({ zodSchema: idEntitySchema, input });

        const config: ProxyConfiguration = {
            // https://developers.dialpad.com/reference/usersdelete
            endpoint: `/api/v2/users/${encodeURIComponent(parsedInput.data.id)}`,
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
