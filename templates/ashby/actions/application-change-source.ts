import { createAction } from "nango";
import type { ProxyConfiguration } from "nango";
import { AshbyResponse, ChangeSource } from "../models.js";

const action = createAction({
    description: "Action to change source of application.",
    version: "0.0.1",

    endpoint: {
        method: "POST",
        path: "/applications/source",
        group: "Applications"
    },

    input: ChangeSource,
    output: AshbyResponse,
    scopes: ["candidatesWrite"],

    exec: async (nango, input): Promise<AshbyResponse> => {
        if (!input.applicationId) {
            throw new nango.ActionError({
                message: 'applicationId is a required field'
            });
        }

        if (!input.sourceId) {
            throw new nango.ActionError({
                message: 'sourceId is a required field'
            });
        }

        const config: ProxyConfiguration = {
            // https://developers.ashbyhq.com/reference/applicationchangesource
            endpoint: '/application.change_source',
            data: input,
            retries: 3
        };

        const response = await nango.post(config);
        return {
            success: response.data.success,
            errors: response.data?.errors,
            results: response.data?.results
        };
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
