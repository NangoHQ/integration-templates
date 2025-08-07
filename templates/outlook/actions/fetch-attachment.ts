import { createAction } from "nango";
import type { ProxyConfiguration } from "nango";
import { Anonymous_outlook_action_fetchattachment_output, DocumentInput } from "../models.js";

const action = createAction({
    description: "An action used to fetch the contents of an attachment.",
    version: "1.0.0",

    endpoint: {
        method: "GET",
        path: "/fetch-attachment"
    },

    input: DocumentInput,
    output: Anonymous_outlook_action_fetchattachment_output,
    scopes: ["Mail.Read"],

    exec: async (nango, input): Promise<Anonymous_outlook_action_fetchattachment_output> => {
        const { threadId, attachmentId } = input;

        const config: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/graph/api/attachment-get?view=graph-rest-1.0&tabs=http#http-request
            endpoint: `/v1.0/me/messages/${threadId}/attachments/${attachmentId}/$value`,
            retries: 3
        };

        const attachmentResponse = await nango.get(config);

        return attachmentResponse.data;
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
