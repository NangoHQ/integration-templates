import { createAction } from "nango";
import type { ProxyConfiguration } from "nango";
import { AshbyResponse, UpdateHistory } from "../models.js";

const action = createAction({
    description: "Action to update history an application stage.",
    version: "0.0.1",

    endpoint: {
        method: "POST",
        path: "/applications/history",
        group: "Applications"
    },

    input: UpdateHistory,
    output: AshbyResponse,
    scopes: ["candidatesWrite"],

    exec: async (nango, input): Promise<AshbyResponse> => {
        if (!input.applicationId) {
            throw new nango.ActionError({
                message: 'applicationId is a required field'
            });
        }

        if (!input.applicationHistory) {
            throw new nango.ActionError({
                message: 'applicationHistory is a required field'
            });
        }

        const config: ProxyConfiguration = {
            // https://developers.ashbyhq.com/reference/applicationupdatehistory
            endpoint: '/application.updateHistory',
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
