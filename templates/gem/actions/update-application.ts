import { createAction } from "nango";
import type { GemApplication } from '../types.js';
import { toApplication } from '../mappers/to-application.js';

import type { ProxyConfiguration } from "nango";
import { Application, UpdateApplicationInput } from "../models.js";

const action = createAction({
    description: "Update an application's source",
    version: "0.0.1",

    endpoint: {
        method: "PATCH",
        path: "/application",
        group: "Applications"
    },

    input: UpdateApplicationInput,
    output: Application,

    exec: async (nango, input): Promise<Application> => {
        const { application_id, ...data } = input;

        const proxyConfig: ProxyConfiguration = {
            // https://api.gem.com/ats/v0/reference#tag/Application/paths/~1ats~1v0~1applications~1%7Bapplication_id%7D/patch
            endpoint: `ats/v0/applications/${application_id}`,
            data,
            retries: 3
        };

        const { data: responseData } = await nango.patch<GemApplication>(proxyConfig);
        return toApplication(responseData);
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
