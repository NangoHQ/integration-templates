import { createAction } from "nango";
import type { ProxyConfiguration } from "nango";
import { SuccessResponse, ArchiveOpportunity } from "../models.js";

const action = createAction({
    description: "Update the archived state of an opportunity",
    version: "1.0.1",

    endpoint: {
        method: "PUT",
        path: "/opportunities/archived",
        group: "Opportunities"
    },

    input: ArchiveOpportunity,
    output: SuccessResponse,

    exec: async (nango, input): Promise<SuccessResponse> => {
        if (!input.opportunityId) {
            throw new nango.ActionError({
                message: 'opportunityId can not be null or undefined'
            });
        }

        interface archiveOpportunity {
            reason: string;
            cleanInterviews?: boolean;
            requisitionId?: string;
        }

        const putData: archiveOpportunity = {
            reason: input.reason,
            cleanInterviews: input?.cleanInterviews ?? false
        };

        if (input.requisitionId) {
            putData.requisitionId = input.requisitionId;
        }

        const path = `/v1/opportunities/${input.opportunityId}/archived`;
        const config: ProxyConfiguration = {
            // https://hire.lever.co/developer/documentation#update-opportunity-archived-state
            endpoint: path,
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
