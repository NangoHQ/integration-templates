import { createAction } from "nango";
import { getHeaders } from '../helpers/get-headers.js';

import type { ProxyConfiguration } from "nango";
import { SuccessResponse, IdEntity } from "../models.js";

const action = createAction({
    description: "Archive an existing user in Bill",
    version: "0.0.1",

    endpoint: {
        method: "DELETE",
        path: "/users",
        group: "Users"
    },

    input: IdEntity,
    output: SuccessResponse,

    exec: async (nango, input): Promise<SuccessResponse> => {
        if (!input.id) {
            throw new nango.ActionError({
                message: 'Id is required to archive a user'
            });
        }

        const headers = await getHeaders(nango);

        const config: ProxyConfiguration = {
            // https://developer.bill.com/reference/archiveorganizationuser
            endpoint: `/v3/users/${input.id}/archive`,
            retries: 3,
            headers: {
                sessionId: headers.sessionId,
                devKey: headers.devKey
            }
        };

        await nango.post(config);

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
