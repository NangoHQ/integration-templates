import { createAction } from "nango";
import type { ProxyConfiguration } from "nango";
import { SuccessResponse, Id } from "../models.js";

const action = createAction({
    description: "Deletes a contact in Hubspot",
    version: "1.0.0",

    endpoint: {
        method: "DELETE",
        path: "/contact",
        group: "Contacts"
    },

    input: Id,
    output: SuccessResponse,
    scopes: ["crm.objects.contacts.write", "oauth"],

    exec: async (nango, input): Promise<SuccessResponse> => {
        const config: ProxyConfiguration = {
            // https://developers.hubspot.com/docs/api/crm/contacts#delete-contacts
            endpoint: `/crm/v3/objects/contacts/${input.id}`,
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
