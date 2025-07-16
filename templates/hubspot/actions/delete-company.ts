import { createAction } from "nango";
import type { ProxyConfiguration } from "nango";
import { SuccessResponse, Id } from "../models.js";

const action = createAction({
    description: "Deletes a company in Hubspot",
    version: "1.0.2",

    endpoint: {
        method: "DELETE",
        path: "/companies",
        group: "Companies"
    },

    input: Id,
    output: SuccessResponse,
    scopes: ["crm.objects.companies.write", "oauth"],

    exec: async (nango, input): Promise<SuccessResponse> => {
        const config: ProxyConfiguration = {
            // https://developers.hubspot.com/docs/api/crm/companies#delete-companies
            endpoint: `/crm/v3/objects/companies/${input.id}`,
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
