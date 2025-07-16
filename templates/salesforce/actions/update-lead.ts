import { createAction } from "nango";
import { updateLeadInputSchema } from '../schema.zod.js';
import { toSalesForceLead } from '../mappers/toLead.js';

import type { ProxyConfiguration } from "nango";
import { SuccessResponse, UpdateLeadInput } from "../models.js";

const action = createAction({
    description: "Update a single lead in salesforce",
    version: "1.0.2",

    endpoint: {
        method: "PATCH",
        path: "/leads",
        group: "Leads"
    },

    input: UpdateLeadInput,
    output: SuccessResponse,
    scopes: ["offline_access", "api"],

    exec: async (nango, input): Promise<SuccessResponse> => {
        const parsedInput = await nango.zodValidateInput({ zodSchema: updateLeadInputSchema, input });

        const salesforceLead = toSalesForceLead(parsedInput.data);
        const config: ProxyConfiguration = {
            // https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_lead.htm
            endpoint: `/services/data/v60.0/sobjects/Lead/${parsedInput.data.id}`,
            data: salesforceLead,
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
