import type { NangoAction } from '../../models';
import type { OneDriveFetchFile } from '../types';

/**
 * Fetches the latest file download URL from OneDrive, which can be used to download the actual file.
 * @param nango - The NangoAction instance used to interact with the external API.
 * @param input - Object containing driveId and itemId.
 * @returns A Promise that resolves with the FetchFile.
 */
export default async function runAction(nango: NangoAction, input: { driveId: string; itemId: string }): Promise<{ id: string; download_url: string | null }> {
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

/**
 * Validates the input to ensure it contains the required fields.
 * @param nango - The NangoAction instance used for error handling.
 * @param input - The input to validate.
 */
function validate(nango: NangoAction, input: { driveId: string; itemId: string }) {
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
