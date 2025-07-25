import { createAction } from "nango";
import type { ProxyConfiguration } from "nango";
import { SuccessResponse, UpdateLinks } from "../models.js";

const action = createAction({
    description: "Update the links in an opportunity",
    version: "2.0.0",

    endpoint: {
        method: "POST",
        path: "/opportunities/links",
        group: "Opportunities"
    },

    input: UpdateLinks,
    output: SuccessResponse,

    exec: async (nango, input): Promise<SuccessResponse> => {
        let endpoint: string;

        if (input.links.length <= 0) {
            throw new nango.ActionError({
                message: 'links can not be an empty array'
            });
        }

        if (!input.opportunityId) {
            throw new nango.ActionError({
                message: 'opportunityId can not be null or undefined'
            });
        }

        const putData = {
            links: input.links
        };

        if (input?.delete) {
            endpoint = `/v1/opportunities/${input.opportunityId}/removeLinks`;
        } else {
            endpoint = `/v1/opportunities/${input.opportunityId}/addLinks`;
        }

        const config: ProxyConfiguration = {
            // https://hire.lever.co/developer/documentation#update-contact-links-by-opportunity
            endpoint,
            data: putData,
            retries: 3
        };

        if (input.perform_as) {
            config.params = { perform_as: input.perform_as };
        }

        const resp = await nango.post(config);
        return {
            success: true,
            opportunityId: input.opportunityId,
            response: resp.data.data
        };
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
