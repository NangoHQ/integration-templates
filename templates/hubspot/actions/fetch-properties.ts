import { createAction } from "nango";
import type { ProxyConfiguration } from "nango";
import { PropertyResponse, InputProperty } from "../models.js";

const action = createAction({
    description: "Fetch the properties of a specified object",
    version: "2.0.0",

    endpoint: {
        method: "GET",
        path: "/properties",
        group: "Properties"
    },

    input: InputProperty,
    output: PropertyResponse,

    scopes: [
        "oauth",
        "media_bridge.read",
        "crm.objects.marketing_events.write",
        "crm.schemas.custom.read",
        "crm.pipelines.orders.read",
        "tickets",
        "crm.objects.feedback_submissions.read",
        "crm.objects.goals.read",
        "crm.objects.custom.write",
        "crm.objects.custom.read",
        "crm.objects.marketing_events.read",
        "timeline",
        "e-commerce",
        "automation"
    ],

    exec: async (nango, input): Promise<PropertyResponse> => {
        if (!input.name) {
            throw new nango.ActionError({
                message: 'An object name must be passed in to look up the properties'
            });
        }

        const config: ProxyConfiguration = {
            // https://developers.hubspot.com/docs/api/crm/properties
            endpoint: `crm/v3/properties/${input.name}`,
            retries: 3
        };
        const response = await nango.get(config);

        return response.data;
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
