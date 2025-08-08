import { createAction } from 'nango';
import type { OneDriveFetchFile } from '../types.js';

import { FetchFile, FetchFileInput } from '../models.js';

/**
 * Fetches the latest file download URL from OneDrive, which can be used to download the actual file.
 * @param nango - The NangoAction instance used to interact with the external API.
 * @param input - Object containing driveId and itemId.
 * @returns A Promise that resolves with the FetchFile.
 */
const action = createAction({
    description: 'This action will be used to fetch the latest file download_url which can be used to download the actual file.',
    version: '2.0.0',

    endpoint: {
        method: 'GET',
        path: '/fetch-file',
        group: 'Files'
    },

    input: FetchFileInput,
    output: FetchFile,
    scopes: ['Files.Read', 'offline_access'],

    exec: async (nango, input): Promise<FetchFile> => {
        validate(nango, input);

        const response = await nango.get<OneDriveFetchFile>({
            // https://learn.microsoft.com/en-us/graph/api/driveitem-get?view=graph-rest-1.0
            endpoint: `/v1.0/drives/${input.driveId}/items/${input.itemId}`,
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

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;

/**
 * Validates the input to ensure it contains the required fields.
 * @param nango - The NangoAction instance used for error handling.
 * @param input - The input to validate.
 */
function validate(nango: NangoActionLocal, input: { driveId: string; itemId: string }) {
    if (!input.driveId) {
        throw new nango.ActionError({
            message: 'Missing required parameter: driveId'
        });
    }

    if (!input.itemId) {
        throw new nango.ActionError({
            message: 'Missing required parameter: itemId'
        });
    }
}
