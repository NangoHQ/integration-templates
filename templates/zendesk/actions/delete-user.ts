import { createAction } from "nango";
import { getSubdomain } from '../helpers/get-subdomain.js';

import type { ProxyConfiguration } from "nango";
import { SuccessResponse, IdEntity } from "../models.js";

const action = createAction({
    description: "Delete a user in Zendesk",
    version: "1.0.0",

    endpoint: {
        method: "DELETE",
        path: "/users",
        group: "Users"
    },

    input: IdEntity,
    output: SuccessResponse,
    scopes: ["users:write"],

    exec: async (nango, input): Promise<SuccessResponse> => {
        if (!input.id) {
            throw new nango.ActionError({
                message: 'Id is required to delete a user'
            });
        }

        const subdomain = await getSubdomain(nango);

        const config: ProxyConfiguration = {
            baseUrlOverride: `https://${subdomain}.zendesk.com`,
            // https://developer.zendesk.com/api-reference/ticketing/users/users/#delete-user
            endpoint: `/api/v2/users/${input.id}`,
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
