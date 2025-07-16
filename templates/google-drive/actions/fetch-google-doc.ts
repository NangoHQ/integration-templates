import { createAction } from "nango";
import type { ProxyConfiguration } from "nango";
import { JSONDocument, IdEntity } from "../models.js";

const action = createAction({
    description: "Fetches the content of a native google document given its ID. Outputs\na JSON reprensentation of a google doc.",
    version: "0.0.1",

    endpoint: {
        method: "GET",
        path: "/fetch-google-document",
        group: "Documents"
    },

    input: IdEntity,
    output: JSONDocument,
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],

    exec: async (nango, input): Promise<JSONDocument> => {
        if (!input || !input.id) {
            throw new nango.ActionError({
                message: 'Invalid input',
                details: 'The input must be an object with an "id" property.'
            });
        }

        const config: ProxyConfiguration = {
            baseUrlOverride: 'https://docs.googleapis.com',
            // https://developers.google.com/docs/api/reference/rest/v1/documents/get
            endpoint: `/v1/documents/${input.id}`,
            params: {
                includeTabsContent: 'true'
            },
            retries: 3
        };

        const documentResponse = await nango.get<JSONDocument>(config);

        if (documentResponse.status !== 200) {
            throw new nango.ActionError(`Failed to fetch document: Status Code ${documentResponse.status}`);
        }

        return documentResponse.data;
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
