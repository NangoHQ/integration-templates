import { createAction } from "nango";
import type { ProxyConfiguration } from "nango";

import {
    AshbyResponse,
    Anonymous_ashby_action_applicationupdate_input,
} from "../models.js";

const action = createAction({
    description: "Action to update an application.",
    version: "2.0.0",

    endpoint: {
        method: "PATCH",
        path: "/applications",
        group: "Applications"
    },

    input: Anonymous_ashby_action_applicationupdate_input,
    output: AshbyResponse,
    scopes: ["candidatesWrite"],

    exec: async (nango, input): Promise<AshbyResponse> => {
        let config: ProxyConfiguration;

        if ('sourceId' in input) {
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
            config = {
                endpoint: '/application.change_source',
                data: input
            };
        } else if ('interviewStageId' in input) {
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
            config = {
                endpoint: '/application.change_stage',
                data: input
            };
        } else if ('applicationHistory' in input) {
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
            config = {
                endpoint: '/application.updateHistory',
                data: input
            };
        } else {
            throw new nango.ActionError({
                message: 'Unsupported input type'
            });
        }

        const response = await nango.post({ ...config, retries: 3 });
        return {
            success: response.data.success,
            errors: response.data?.errors,
            results: response.data?.results
        };
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
