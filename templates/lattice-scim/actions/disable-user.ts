import { createAction } from "nango";
import { idEntitySchema } from '../schema.zod.js';

import type { ProxyConfiguration } from "nango";
import { SuccessResponse, IdEntity } from "../models.js";

const action = createAction({
    description: "Disables a user in Lattice",
    version: "0.0.1",

    endpoint: {
        method: "DELETE",
        path: "/users",
        group: "Users"
    },

    input: IdEntity,
    output: SuccessResponse,

    exec: async (nango, input): Promise<SuccessResponse> => {
        const parsedInput = await nango.zodValidateInput({ zodSchema: idEntitySchema, input });

        const config: ProxyConfiguration = {
            // https://developers.toriihq.com/docs/lattice-disable-user
            endpoint: `scim/v2/Users/${encodeURIComponent(parsedInput.data.id)}`,
            retries: 3,
            data: {
                schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
                Operations: [
                    {
                        op: 'replace',
                        path: 'active',
                        value: false
                    }
                ]
            }
        };

        await nango.patch(config);

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
