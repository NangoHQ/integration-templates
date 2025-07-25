import { createAction } from "nango";
import type { SharepointFetchFile } from '../types.js';

import { FetchFile, FetchFileInput } from "../models.js";

/**
 * Fetches the latest file download URL from SharePoint, which can be used to download the actual file by making an XMLHttpRequest.
 * @param nango - The NangoAction instance used to interact with the external API.
 * @param input - Object containing siteId and itemId.
 * @returns A Promise that resolves with the FetchFile.
 */
const action = createAction({
    description: "This action will be used to fetch the latest file download_url which can be used to download the actual file.",
    version: "2.0.0",

    endpoint: {
        method: "GET",
        path: "/fetch-file"
    },

    input: FetchFileInput,
    output: FetchFile,
    scopes: ["MyFiles.Read", "offline_access"],

    exec: async (nango, input): Promise<FetchFile> => {
        validate(nango, input);

        const response = await nango.get<SharepointFetchFile>({
            endpoint: `/v1.0/sites/${input.siteId}/drive/items/${input.itemId}`,
            params: {
                select: 'id, @microsoft.graph.downloadUrl'
            },
            retries: 3
        });

        return {
            id: response.data.id,
            download_url: response.data['@microsoft.graph.downloadUrl'] ?? null
        };
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;

/**
 * Validates the input to ensure it contains the required fields.
 * @param nango - The NangoAction instance used for error handling.
 * @param input - The input to validate.
 */
function validate(nango: NangoActionLocal, input: FetchFileInput) {
    if (!input.siteId) {
        throw new nango.ActionError({
            message: 'Missing required parameter: siteId'
        });
    }

    if (!input.itemId) {
        throw new nango.ActionError({
            message: 'Missing required parameter: itemId'
        });
    }
}
