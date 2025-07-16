import { createAction } from "nango";
import type { ProxyConfiguration } from "nango";
import { AshbyResponse, ChangeStage } from "../models.js";

const action = createAction({
    description: "Action to change stage of an application.",
    version: "0.0.1",

    endpoint: {
        method: "POST",
        path: "/applications/stage",
        group: "Applications"
    },

    input: ChangeStage,
    output: AshbyResponse,
    scopes: ["candidatesWrite"],

    exec: async (nango, input): Promise<AshbyResponse> => {
        if (!input.applicationId) {
            throw new nango.ActionError({
                message: 'applicationId is a required field'
            });
        }

        if (!input.interviewStageId) {
            throw new nango.ActionError({
                message: 'interviewStageId is a required field'
            });
        }

        const config: ProxyConfiguration = {
            // https://developers.ashbyhq.com/reference/applicationchangestage
            endpoint: '/application.change_stage',
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
