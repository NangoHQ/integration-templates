import { createAction } from "nango";
import { idEntitySchema } from '../schema.zod.js';

import type { ProxyConfiguration } from "nango";
import { SuccessResponse, IdEntity } from "../models.js";

const action = createAction({
    description: "Delete a single opportunity in salesforce",
    version: "1.0.1",

    endpoint: {
        method: "DELETE",
        path: "/opportunities",
        group: "Opportunities"
    },

    input: IdEntity,
    output: SuccessResponse,
    scopes: ["offline_access", "api"],

    exec: async (nango, input): Promise<SuccessResponse> => {
        const parsedInput = await nango.zodValidateInput({ zodSchema: idEntitySchema, input });

        const config: ProxyConfiguration = {
            // https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_opportunity.htm
            endpoint: `/services/data/v60.0/sobjects/Opportunity/${parsedInput.data.id}`,
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
