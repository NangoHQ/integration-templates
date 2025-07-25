import { createAction } from "nango";
import { idEntitySchema } from '../schema.zod.js';

import type { ProxyConfiguration } from "nango";
import { SuccessResponse, IdEntity } from "../models.js";

const action = createAction({
    description: "Delete a single account in salesforce",
    version: "2.0.0",

    endpoint: {
        method: "DELETE",
        path: "/accounts",
        group: "Accounts"
    },

    input: IdEntity,
    output: SuccessResponse,
    scopes: ["offline_access", "api"],

    exec: async (nango, input): Promise<SuccessResponse> => {
        const parsedInput = await nango.zodValidateInput({ zodSchema: idEntitySchema, input });

        const config: ProxyConfiguration = {
            // https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_account.htm
            endpoint: `/services/data/v60.0/sobjects/Account/${parsedInput.data.id}`,
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
