import { createAction } from "nango";
import { createLeadInputSchema } from '../schema.zod.js';
import { toSalesForceLead } from '../mappers/toLead.js';

import type { ProxyConfiguration } from "nango";
import { ActionResponse, CreateLeadInput } from "../models.js";

const action = createAction({
    description: "Create a single lead in salesforce",
    version: "1.0.2",

    endpoint: {
        method: "POST",
        path: "/leads",
        group: "Leads"
    },

    input: CreateLeadInput,
    output: ActionResponse,
    scopes: ["offline_access", "api"],

    exec: async (nango, input): Promise<ActionResponse> => {
        const parsedInput = await nango.zodValidateInput({ zodSchema: createLeadInputSchema, input });

        const salesforceLead = toSalesForceLead(parsedInput.data);
        const config: ProxyConfiguration = {
            // https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_lead.htm
            endpoint: '/services/data/v60.0/sobjects/Lead',
            data: salesforceLead,
            retries: 3
        };
        const response = await nango.post(config);

        return response.data;
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
