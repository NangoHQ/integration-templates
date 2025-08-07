import { createAction } from "nango";
import type { ProxyConfiguration } from "nango";
import { TenantResponse } from "../models.js";
import { z } from "zod";

const action = createAction({
    description: "Fetches all the tenants the connection has access to.\nThis can be used to set the metadata to the selected tenant.",
    version: "1.0.0",

    endpoint: {
        method: "GET",
        path: "/tenants",
        group: "Tenants"
    },

    input: z.void(),
    output: TenantResponse,

    exec: async (nango): Promise<TenantResponse> => {
        const config: ProxyConfiguration = {
            // https://developer.xero.com/documentation/guides/oauth2/tenants
            endpoint: 'connections',
            retries: 3
        };
        const { data: tenants } = await nango.get(config);

        return { tenants };
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
