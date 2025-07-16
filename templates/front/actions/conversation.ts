import { createAction } from "nango";
import type { FrontMessageOutput, FrontMessages, SingleConversation } from '../types.js';

import type { ProxyConfiguration } from "nango";
import { FrontMessageOutput, SingleConversation, FrontMessages } from "../models.js";

const action = createAction({
    description: "List the messages in a conversation in reverse chronological order (newest first).",
    version: "1.0.2",

    endpoint: {
        method: "GET",
        path: "/conversations/all",
        group: "Conversations"
    },

    input: SingleConversation,
    output: FrontMessageOutput,

    exec: async (nango, input): Promise<FrontMessageOutput> => {
        const result = [];

        const config: ProxyConfiguration = {
            // https://dev.frontapp.com/reference/get-conversation-by-id
            endpoint: `/conversations/${input.id}/messages`,
            retries: 3,
            paginate: {
                type: 'link',
                response_path: '_results',
                limit_name_in_request: 'limit',
                link_path_in_response_body: 'next',
                limit: 100
            }
        };

        for await (const messageArray of nango.paginate<FrontMessages>(config)) {
            for (const singleMessage of messageArray) {
                result.push(singleMessage);
            }
        }
        return {
            messages: result
        };
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
