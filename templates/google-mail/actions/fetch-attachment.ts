import { createAction } from "nango";
import type { GoogleMailFile } from '../types.js';

import type { ProxyConfiguration } from "nango";
import { Anonymous_googlemail_action_fetchattachment_output, DocumentInput } from "../models.js";

//Fetch attachment content
const action = createAction({
    description: "An action used to fetch the contents of an attachment.",
    version: "1.0.1",

    endpoint: {
        method: "GET",
        path: "/attachment"
    },

    input: DocumentInput,
    output: Anonymous_googlemail_action_fetchattachment_output,
    scopes: ["https://www.googleapis.com/auth/gmail.readonly"],

    exec: async (nango, input): Promise<Anonymous_googlemail_action_fetchattachment_output> => {
        const { threadId, attachmentId } = input;

        const config: ProxyConfiguration = {
            // https://developers.google.com/gmail/api/reference/rest/v1/users.messages.attachments/get
            endpoint: `/gmail/v1/users/me/messages/${threadId}/attachments/${attachmentId}`,
            retries: 3
        };

        const attachmentResponse = await nango.get<GoogleMailFile>(config);

        return attachmentResponse.data.data;
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
