import { createAction } from "nango";
import type { ProxyConfiguration } from "nango";
import { UpdateOpportunityStage, SuccessResponse } from "../models.js";

const action = createAction({
    description: "Update the stage in an opportunity",
    version: "2.0.0",

    endpoint: {
        method: "POST",
        path: "/opportunities/stages",
        group: "Opportunities"
    },

    input: UpdateOpportunityStage,
    output: SuccessResponse,

    exec: async (nango, input): Promise<SuccessResponse> => {
        if (!input.opportunityId) {
            throw new nango.ActionError({
                message: 'opportunityId can not be null or undefined'
            });
        }

        type postData = Pick<UpdateOpportunityStage, 'stage'>;

        const putData: postData = {
            stage: input.stage
        };

        const endpoint = `/v1/opportunities/${input.opportunityId}/stage`;
        const config: ProxyConfiguration = {
            // https://hire.lever.co/developer/documentation#update-opportunity-stage
            endpoint,
            data: putData,
            retries: 3
        };

        if (input.perform_as) {
            config.params = { perform_as: input.perform_as };
        }

        const resp = await nango.put(config);
        return {
            success: true,
            opportunityId: input.opportunityId,
            response: resp.data.data
        };
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
