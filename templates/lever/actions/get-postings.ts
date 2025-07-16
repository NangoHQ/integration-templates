import { createAction } from "nango";
import type { ProxyConfiguration } from "nango";
import { SuccessResponse } from "../models.js";
import { z } from "zod";

const action = createAction({
    description: "Get all posts for your account. Note that this does\nnot paginate the response so it is possible that not all postings \nare returned.",
    version: "1.0.1",

    endpoint: {
        method: "GET",
        path: "/posts/limited",
        group: "Posts"
    },

    input: z.void(),
    output: SuccessResponse,

    exec: async (nango): Promise<SuccessResponse> => {
        const config: ProxyConfiguration = {
            // https://hire.lever.co/developer/documentation#list-all-stages
            endpoint: `/v1/postings`,
            retries: 3
        };

        const resp = await nango.get(config);
        return {
            response: resp.data.data,
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
