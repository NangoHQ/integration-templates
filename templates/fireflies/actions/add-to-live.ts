import { createAction } from "nango";
import { FirefliesAddtoLiveResponse, FirefliesAddtoLiveInput } from "../models.js";

const action = createAction({
    description: "Action to add the Fireflies.ai bot to an ongoing meeting",
    version: "2.0.0",

    endpoint: {
        method: "POST",
        path: "/fireflies/add-to-live"
    },

    input: FirefliesAddtoLiveInput,
    output: FirefliesAddtoLiveResponse,

    exec: async (nango, input): Promise<FirefliesAddtoLiveResponse> => {
        if (!input.query) {
            throw new nango.ActionError({
                message: 'query is required'
            });
        } else if (!input.variables) {
            throw new nango.ActionError({
                message: 'variables are required'
            });
        }

        const endpoint = `/graphql`;

        const postData = {
            query: input.query,
            variables: input.variables
        };

        const resp = await nango.post({
            endpoint: endpoint,
            data: postData,
            retries: 3
        });

        return {
            data: resp.data
        };
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
