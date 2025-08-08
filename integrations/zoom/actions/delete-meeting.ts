import { createAction } from "nango";
import type { ProxyConfiguration } from "nango";
import { SuccessResponse, IdEntity } from "../models.js";

const action = createAction({
    description: "Deletes a meeting in Zoom",
    version: "1.0.0",

    endpoint: {
        method: "DELETE",
        path: "/meetings",
        group: "Meetings"
    },

    input: IdEntity,
    output: SuccessResponse,
    scopes: ["meeting:write"],

    exec: async (nango, input): Promise<SuccessResponse> => {
        if (!input.id) {
            throw new nango.ActionError({
                message: 'Id is required to delete a meeting'
            });
        }

        const config: ProxyConfiguration = {
            // https://developers.zoom.us/docs/api/meetings/#tag/meetings/DELETE/meetings/{meetingId}
            endpoint: `/meetings/${input.id}`,
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
