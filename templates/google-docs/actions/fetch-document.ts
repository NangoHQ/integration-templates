import { createAction } from "nango";
import type { ProxyConfiguration } from "nango";
import { Document, DocumentId } from "../models.js";

const action = createAction({
    description: "Fetches the content of a document given its ID.",
    version: "2.0.0",

    endpoint: {
        method: "GET",
        path: "/fetch-document"
    },

    input: DocumentId,
    output: Document,
    scopes: ["https://www.googleapis.com/auth/documents.readonly"],

    exec: async (nango, input): Promise<Document> => {
        if (!input || !input.id) {
            throw new nango.ActionError({
                message: 'Invalid input',
                details: 'The input must be an object with an "id" property.'
            });
        }

        const config: ProxyConfiguration = {
            // https://developers.google.com/docs/api/reference/rest/v1/documents/get
            endpoint: `/v1/documents/${input.id}`,
            params: {
                includeTabsContent: 'true'
            },
            retries: 3
        };

        const documentResponse = await nango.get<Document>(config);

        if (documentResponse.status !== 200) {
            throw new nango.ActionError(`Failed to fetch document: Status Code ${documentResponse.status}`);
        }

        return documentResponse.data;
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
