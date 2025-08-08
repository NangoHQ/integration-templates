import { createAction } from "nango";
import { updateOpportunityInputSchema } from '../schema.zod.js';
import { toSalesForceOpportunity } from '../mappers/toOpportunity.js';

import type { ProxyConfiguration } from "nango";
import { SuccessResponse, UpdateOpportunityInput } from "../models.js";

const action = createAction({
    description: "Update a single opportunity in salesforce",
    version: "2.0.0",

    endpoint: {
        method: "PATCH",
        path: "/opportunities",
        group: "Opportunities"
    },

    input: UpdateOpportunityInput,
    output: SuccessResponse,
    scopes: ["offline_access", "api"],

    exec: async (nango, input): Promise<SuccessResponse> => {
        const parsedInput = await nango.zodValidateInput({ zodSchema: updateOpportunityInputSchema, input });

        const salesforceOpportunity = toSalesForceOpportunity(parsedInput.data);
        const config: ProxyConfiguration = {
            // https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_opportunity.htm
            endpoint: `/services/data/v60.0/sobjects/Opportunity/${parsedInput.data.id}`,
            data: salesforceOpportunity,
            retries: 3
        };

        await nango.patch(config);

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
